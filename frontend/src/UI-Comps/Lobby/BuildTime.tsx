import buildInfo from '../../buildInfo.json';

export const BuildTime = () => {
    return <p className={`absolute bottom-2 right-2 font-mono text-xs text-white opacity-50`}>
        Build: {new Date(buildInfo.datetime).toLocaleString()}
    </p>;
};