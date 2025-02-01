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
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'], // Resolve both JS and JSX
    alias: {
      '@': path.resolve(__dirname, 'src'), // Alias '@' to 'src' directory
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
