#!/usr/bin/env bash
# Recreates every Azure resource for hello-agentic-app from scratch and
# deploys the latest code on the `master` branch. Counterpart to
# azure-teardown.sh.
#
# What this creates:
#   - Resource group rg-hello-agentic
#   - A Linux App Service Plan (Free tier by default - see PLAN_SKU below)
#   - The API web app (hello-agentic-api-whiterose), .NET 10, with the
#     entry point pinned explicitly (avoids the dotnet-publish ambiguity
#     documented in docs/plan.md Ambiguity A1 / PR #3)
#   - The Static Web App (hello-agentic-web-whiterose), Free tier
#   - Wires the API's CORS to the Static Web App's actual origin
#   - Refreshes the GitHub Actions secrets used by .github/workflows/deploy.yml
#     (AZURE_WEBAPP_PUBLISH_PROFILE, AZURE_STATIC_WEB_APPS_API_TOKEN), since
#     recreating these resources invalidates the old credentials
#   - Triggers the Deploy to Azure workflow to publish current `master`
#
# IMPORTANT: WEBAPP_NAME below must match the hardcoded API URL in
# .github/workflows/deploy.yml (VITE_API_BASE_URL). If you rename it here,
# update that workflow file too.
#
# Cost note: PLAN_SKU=F1 (Free) means ~60 CPU-minutes/day quota and the app
# sleeping after idle (cold starts on the next request) - fine for
# occasional demo use. Set PLAN_SKU=B1 below for an always-on plan
# (~$13/month) if you need something more reliable.
#
# Usage:
#   ./utils/azure-setup.sh
#
# Requires: az CLI (logged in via `az login`), gh CLI (logged in via
# `gh auth login` with `repo` and `workflow` scopes).

set -euo pipefail

RESOURCE_GROUP="rg-hello-agentic"
LOCATION="ukwest"
SWA_LOCATION="eastus2"   # Azure Static Web Apps isn't available in ukwest
PLAN_NAME="plan-hello-linux"
PLAN_SKU="F1"             # Free tier. Use "B1" for an always-on Basic plan.
WEBAPP_NAME="hello-agentic-api-whiterose"
SWA_NAME="hello-agentic-web-whiterose"
REPO="whiterose-it-services/hello-agentic-app"

echo "== Checking prerequisites =="
command -v az >/dev/null || { echo "az CLI not found. Install: https://aka.ms/installazurecliwindows" >&2; exit 1; }
command -v gh >/dev/null || { echo "gh CLI not found. Install: https://cli.github.com" >&2; exit 1; }
az account show >/dev/null 2>&1 || { echo "Not logged into az. Run: az login" >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Not logged into gh. Run: gh auth login" >&2; exit 1; }

echo "== Creating resource group '$RESOURCE_GROUP' in $LOCATION =="
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" -o none

echo "== Creating Linux App Service Plan '$PLAN_NAME' ($PLAN_SKU) =="
az appservice plan create \
  --name "$PLAN_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --is-linux \
  --sku "$PLAN_SKU" \
  -o none

echo "== Creating web app '$WEBAPP_NAME' (.NET 10) =="
az webapp create \
  --name "$WEBAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$PLAN_NAME" \
  --runtime "DOTNETCORE:10.0" \
  -o none

echo "== Pinning the startup command to avoid entry-point ambiguity =="
az webapp config set \
  --name "$WEBAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --startup-file "dotnet api.dll" \
  -o none

echo "== Creating Static Web App '$SWA_NAME' (Free tier, $SWA_LOCATION) =="
az staticwebapp create \
  --name "$SWA_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$SWA_LOCATION" \
  --sku Free \
  -o none

SWA_HOSTNAME=$(az staticwebapp show --name "$SWA_NAME" --resource-group "$RESOURCE_GROUP" --query "defaultHostname" -o tsv)
SWA_URL="https://${SWA_HOSTNAME}"
API_URL="https://${WEBAPP_NAME}.azurewebsites.net"

echo "== Wiring CORS: API will accept requests from $SWA_URL =="
az webapp config appsettings set \
  --name "$WEBAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings "Cors__AllowedOrigin=${SWA_URL}" \
  -o none

echo "== Refreshing GitHub Actions secrets =="
# Piped directly rather than written to a file first: a UTF-16-encoded
# publish profile (the default when redirected with `>` on Windows) broke
# this exact secret once already. Piping keeps az CLI's own UTF-8 output
# intact.
az webapp deployment list-publishing-profiles \
  --name "$WEBAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --xml | gh secret set AZURE_WEBAPP_PUBLISH_PROFILE --repo "$REPO"

az staticwebapp secrets list \
  --name "$SWA_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.apiKey" -o tsv | gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --repo "$REPO"

echo "== Triggering deploy of latest master =="
gh workflow run "Deploy to Azure" --repo "$REPO" --ref master

echo "Waiting for the run to start..."
sleep 8
RUN_ID=$(gh run list --repo "$REPO" --workflow="Deploy to Azure" --limit 1 --json databaseId --jq '.[0].databaseId')

echo "== Waiting for deploy run $RUN_ID to finish =="
for _ in $(seq 1 30); do
  STATUS=$(gh run view "$RUN_ID" --repo "$REPO" --json status --jq '.status')
  if [ "$STATUS" == "completed" ]; then
    break
  fi
  sleep 10
done

CONCLUSION=$(gh run view "$RUN_ID" --repo "$REPO" --json conclusion --jq '.conclusion')
echo "Deploy run finished with conclusion: $CONCLUSION"

if [ "$CONCLUSION" != "success" ]; then
  echo "Deploy did not succeed. Check: gh run view $RUN_ID --repo $REPO --log" >&2
  exit 1
fi

echo ""
echo "== Verifying =="
for i in $(seq 1 10); do
  CODE=$(curl -s --max-time 15 -o /dev/null -w "%{http_code}" "${API_URL}/api/message" || echo "000")
  if [ "$CODE" == "200" ]; then
    echo "API is up: ${API_URL}/api/message"
    break
  fi
  echo "  API not ready yet (HTTP $CODE), retrying... ($i/10)"
  sleep 10
done

echo ""
echo "Done."
echo "  API:      ${API_URL}/api/message"
echo "  Web app:  ${SWA_URL}"
