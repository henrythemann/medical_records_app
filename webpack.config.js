const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/App.jsx', // Entry point of your React app
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js', // The bundled output
  },
  module: {
    rules: [
      {
        test: /\.module\.[s]{0,1}css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true,
            }
          }
        ]
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.module.css', '.module.scss'],
    alias: {
      '@': path.resolve(__dirname, 'src'), // Alias '@' to 'src' directory
    },
    fallback: {
      fs: false, // completely stub out 'fs'
      path: require.resolve('path-browserify'),
      '@icr/polyseg-wasm': false,
    },
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 3000,
  },
};
