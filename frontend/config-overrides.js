const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = function override(config) {
    config.resolve.plugins = [
        new TsconfigPathsPlugin({
            configFile: './tsconfig.json',
        }),
    ];

    // Ensure TypeScript loader is present
    config.module.rules.push({
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
    });

    return config;
};