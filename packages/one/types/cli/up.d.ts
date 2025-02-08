export declare function run(args: {}): void;
interface DockerConfig {
    socketPath?: string;
    host?: string;
    port?: number;
    protocol?: string;
    containerFilters?: string;
}
interface HostInfo {
    Containers: number;
    ContainersRunning: number;
    ContainersPaused: number;
    ContainersStopped: number;
    Images: number;
    OperatingSystem: string;
    Architecture: string;
    MemTotal: number;
    Host: string;
    ServerVersion: string;
    ApiVersion: string;
}
declare const createDockerBridge: (config: DockerConfig) => {
    ping: () => Promise<unknown>;
    listImages: () => Promise<unknown>;
    systemDf: () => Promise<unknown>;
    listContainers: () => Promise<unknown>;
    listServices: () => Promise<unknown>;
    stopAllContainers: () => Promise<any>;
    removeAllContainers: () => Promise<any>;
    removeAllImages: () => Promise<any>;
    getInfo: () => Promise<HostInfo>;
    getContainer: (containerId: string) => Promise<unknown>;
    getService: (serviceId: string) => Promise<unknown>;
    getImage: (imageId: string) => Promise<unknown>;
    restartContainer: (containerId: string) => Promise<unknown>;
    stopContainer: (containerId: string) => Promise<unknown>;
    removeContainer: (containerId: string) => Promise<unknown>;
    removeImage: (imageId: string) => Promise<unknown>;
    getContainerStats: (containerId: string) => Promise<unknown>;
    getContainerLogs: (containerId: string) => Promise<unknown>;
    getServiceLogs: (serviceId: string) => Promise<unknown>;
};
export default createDockerBridge;
//# sourceMappingURL=up.d.ts.map