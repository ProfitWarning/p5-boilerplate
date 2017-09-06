const webpack = require('webpack');
const Path = require('path');
const merge = require('webpack-merge');

const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');


const PATHS = {
  src: Path.join(__dirname, 'src'),
  build: Path.join(__dirname, 'build'),
  assets: Path.join(__dirname, 'assets'),
};

/**
 * Webpack config parts
 */

const lintJavaScript = ({ include, exclude, options }) => ({
  module: {
    rules: [
      {
        test: /\.js$/,
        include,
        exclude,
        enforce: 'pre',

        loader: 'eslint-loader',
        options,
      },
    ],
  },
});

const devServer = ({ host, port } = {}) => ({
  devServer: {
    historyApiFallback: true,
    stats: 'errors-only',
    host, // Defaults to `localhost`
    port, // Defaults to 8080
    overlay: {
      errors: true,
      warnings: true,
    },
  },
});

const generateSourceMaps = ({ type }) => ({
  devtool: type,
});

const loadJavaScript = ({ include, exclude }) => ({
  module: {
    rules: [
      {
        test: /\.js$/,
        include,
        exclude,

        loader: 'babel-loader',
        options: {
          // Enable caching for improved performance during
          // development.
          // It uses default OS directory by default. If you need
          // something more custom, pass a path to it.
          // I.e., { cacheDirectory: '<path>' }
          cacheDirectory: true,
        },
      },
    ],
  },
});

const page = ({
  path = '',
  template = require.resolve(
    Path.resolve(__dirname, PATHS.src, 'index.html')
  ),
  title,
  entry,
  chunks,
} = {}) => ({
  entry,
  plugins: [
    new HtmlWebpackPlugin({
      chunks,
      filename: `${path && path + '/'}index.html`,
      template,
      title,
    }),
    new CopyWebpackPlugin([
      {
        from: PATHS.assets,
        to: PATHS.build  + '/assets',
      },
    ]),
  ],
});

const setFreeVariable = (key, value) => {
  const env = {};
  env[key] = JSON.stringify(value);

  return {
    plugins: [
      new webpack.DefinePlugin(env),
    ],
  };
};

const extractBundles = (bundles) => ({
  plugins: bundles.map((bundle) => (
    new webpack.optimize.CommonsChunkPlugin(bundle)
  )),
});

const clean = (path) => ({
  plugins: [
    new CleanWebpackPlugin([path]),
  ],
});

const minifyJavaScript = () => ({
  plugins: [
    new UglifyJSPlugin(),
  ],
});

/**
 * Create Config
 */

const commonConfig = merge([
  {
    output: {
      path: PATHS.build,
      filename: '[name].js',
    },
  },
  lintJavaScript({ include: PATHS.src }),
  loadJavaScript({ include: PATHS.src }),
]);

const developmentConfig = merge([
  {
    output: {
      devtoolModuleFilenameTemplate: 'webpack:///[absolute-resource-path]',
    },
  },
  generateSourceMaps({ type: 'cheap-module-eval-source-map' }),
  devServer({
    // Customize host/port here if needed
    host: process.env.HOST,
    port: process.env.PORT,
  }),
]);

const productionConfig = merge([
  {
    performance: {
      hints: 'warning', // 'error' or false are valid too
      maxEntrypointSize: 100000, // in bytes
      maxAssetSize: 450000, // in bytes
    },
    output: {
      chunkFilename: '[name].[chunkhash:8].js',
      filename: '[name].[chunkhash:8].js',
    },
    plugins: [
      new webpack.HashedModuleIdsPlugin(),
    ],
    // recordsPath: Path.join(__dirname, 'records.json'),
  },
  clean(PATHS.build),
  minifyJavaScript(),
  extractBundles([
    {
      name: 'vendor',
      minChunks: ({ resource }) => (
        resource &&
        resource.indexOf('node_modules') >= 0 &&
        resource.match(/\.js$/)
      ),
    },
    {
      name: 'manifest',
      minChunks: Infinity,
    },
  ]),
  generateSourceMaps({ type: 'source-map' }),
  setFreeVariable(
    'process.env.NODE_ENV',
    'production'
  ),
]);

module.exports = (env) => {
  const projects = [
    page({
      title: 'p5.js demo',
      entry: {
        app: PATHS.src,
      },
      chunks: ['app', 'manifest', 'vendor'],
    }),
  ];

  const config = env === 'production' ?
    productionConfig :
    developmentConfig;

  return merge([commonConfig, config].concat(projects));
};
