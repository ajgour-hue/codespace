import { k8sCoreV1Api } from "./config.js";

export const createService = async (sandboxId) => {

    // Create the service manifest
    const serviceManifest = {
        metadata: {
            name: `sandbox-service-${sandboxId}`,
            labels: {
                app: 'sandbox',
                sandboxId: sandboxId
            }
        },
        spec: {
            selector: {
                app: 'sandbox',
                sandboxId: sandboxId
            },
            ports: [
                {
                    name: "http",
                    port: 80,
                    targetPort: 5173,
                    protocol: "TCP"
                }
            ],
            type: "ClusterIP"
        }
    }

    // Create the service in the default namespace
    const response = await k8sCoreV1Api.createNamespacedService({
        namespace: 'default',
        body: serviceManifest
    })

    return response;
}