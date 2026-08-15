#!/usr/bin/env bash
# Deletes every Azure resource for hello-agentic-app by deleting the whole
# resource group. This is the counterpart to azure-setup.sh: tear this down
# when you're not actively using the deployed app, run azure-setup.sh again
# when you want it back.
#
# Cost note: this app's only ongoing cost is whatever tier the App Service
# Plan is on (the Static Web App is always Free tier). Stopping the web app
# does NOT stop billing for it - only deleting the plan does. Hence: delete
# the whole resource group rather than just stopping things.
#
# Usage:
#   ./utils/azure-teardown.sh          (asks for confirmation)
#   ./utils/azure-teardown.sh --yes    (skips confirmation, for scripting)
#
# Requires: az CLI, logged in (`az login`) with access to the subscription.

set -euo pipefail

RESOURCE_GROUP="rg-hello-agentic"

command -v az >/dev/null || { echo "az CLI not found. Install: https://aka.ms/installazurecliwindows" >&2; exit 1; }
az account show >/dev/null 2>&1 || { echo "Not logged into az. Run: az login" >&2; exit 1; }

if ! az group show --name "$RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Resource group '$RESOURCE_GROUP' does not exist. Nothing to tear down."
  exit 0
fi

echo "This will permanently delete resource group '$RESOURCE_GROUP' and everything in it:"
echo ""
az resource list --resource-group "$RESOURCE_GROUP" --query "[].{name:name, type:type}" -o table
echo ""

if [ "${1:-}" != "--yes" ]; then
  read -r -p "Type the resource group name to confirm deletion: " CONFIRM
  if [ "$CONFIRM" != "$RESOURCE_GROUP" ]; then
    echo "Confirmation did not match '$RESOURCE_GROUP'. Aborting, nothing was deleted."
    exit 1
  fi
fi

echo "Deleting resource group '$RESOURCE_GROUP' (this can take a few minutes)..."
az group delete --name "$RESOURCE_GROUP" --yes

echo ""
echo "Done. Resource group '$RESOURCE_GROUP' and everything in it has been deleted."
echo "Note: the GitHub secrets AZURE_WEBAPP_PUBLISH_PROFILE and"
echo "AZURE_STATIC_WEB_APPS_API_TOKEN now point at deleted resources. They will"
echo "be safely overwritten the next time you run azure-setup.sh."
