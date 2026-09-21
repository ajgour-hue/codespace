import { k8sCoreV1Api } from "./config.js";


export async function createPod(sandboxId) {

    // Create the pod manifest
    const podManifest = {
        metadata: {
            name: `sandbox-pod-${sandboxId}`,
            labels: {
                app: 'sandbox-runtime',
                sandboxId: sandboxId
            }
        },
        spec: {

            volumes: [
                {
                    name: "workspace-volume",
                    emptyDir: {}
                }
            ],

            initContainers: [
                {
                    name: 'init-container',
                    image: "template",
                    imagePullPolicy: "IfNotPresent",
                    name: 'init-container',
                    command: ['sh', '-c', 'cp -r /workspace/. /seed/'],
                    volumeMounts: [
                        {
                            name: "workspace-volume",   
                            mountPath: "/seed"
                        }
                    ]
                }
            ],

            containers: [
                {
                    image: "template",
                    imagePullPolicy: "IfNotPresent",
                    name: 'sandbox-container',
                    ports: [ { containerPort: 5173, name: "http" } ],
                    resources: {
                        limits: { cpu: "500m", memory: "1Gi" },
                        requests: { cpu: "250m", memory: "500Mi" }
                    },
                    volumeMounts: [
                        {
                            name: "workspace-volume",
                            mountPath: "/workspace"
                        }
                    ]
                
                },
                {
                    image: "agent",
                    imagePullPolicy: "IfNotPresent",
                    name: 'agent-container',
                    ports: [ { containerPort: 3000, name: "http" } ],
                    resources: {
                        limits: { cpu: "500m", memory: "1Gi" },
                        requests: { cpu: "250m", memory: "500Mi" }
                    },
                    volumeMounts: [
                        {
                            name: "workspace-volume",   
                            mountPath: "/workspace"
                        }
                    ]   
                }
            ]
        }
    }

    // Create the pod in the default namespace
    const response = await k8sCoreV1Api.createNamespacedPod({
        namespace: 'default',
        body: podManifest
    })

    return response;
}