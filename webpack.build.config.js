const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const BabiliPlugin = require("babili-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const helpers = require("./config/helpers");

// Config directories
const SRC_DIR = path.resolve(__dirname, "src");
const OUTPUT_DIR = path.resolve(__dirname, "dist");

// Any directories you will be adding code/files into, need to be added to this array so webpack will pick them up
const defaultInclude = [SRC_DIR];

module.exports = {
	entry: SRC_DIR + "/index.js",
	output: {
		path: OUTPUT_DIR,
		publicPath: "./",
		filename: "bundle.js"
	},
	module: {
		rules: [
			{
				test: /\.scss$/,
				use: ExtractTextPlugin.extract({
					fallback: "style-loader",
					use: ["css-loader", "sass-loader"]
				})
			},
			{
				test: /\.css$/,
				use: ExtractTextPlugin.extract({
					fallback: "style-loader",
					use: "css-loader"
				})
			},
			{
				test: /\.jsx?$/,
				use: [{ loader: "babel-loader" }],
				include: defaultInclude
			},
			{
				test: /\.(jpe?g|png|gif)$/,
				use: [{ loader: "file-loader?name=img/[name]__[hash:base64:5].[ext]" }],
				include: defaultInclude
			},
			{
				test: /\.(eot|svg|ttf|woff|woff2)$/,
				loader: "file-loader?name=public/fonts/[name].[ext]"
			},
			{ test: /\.(png)$/, loader: "url-loader?limit=100000" }
		]
	},
	target: "electron-renderer",
	plugins: [
		new HtmlWebpackPlugin({
			template: helpers.root("public/index.html"),
			inject: "body",
			title: "Electron Fixes"
		}),
		new ExtractTextPlugin("bundle.css"),
		new webpack.DefinePlugin({
			"process.env.NODE_ENV": '"production"'
		}),
		new BabiliPlugin()
	],
	stats: {
		colors: true,
		children: false,
		chunks: false,
		modules: false
	}
};
