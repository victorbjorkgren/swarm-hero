import os from "os";

export const getNetworkIP = (): string => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;  // Return the network IP
            }
        }
    }
    console.log('Could not find network interface, returning localhost');
    return 'localhost';
};
