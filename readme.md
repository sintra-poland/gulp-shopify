# Gulp for Sintra

This is pre-made gulp tasks for shopify projects.

## Installation

`npm i @sintra-poland/gulp-shopify --save-dev`

## Basic usage

Minimal `Gulpfile.js` with default configuration:

```js
const { Gulp } = require('@sintra-poland/gulp-shopify');

new Gulp(exports);
```

Additional configuration:

```js
const { Gulp } = require('@sintra-poland/gulp-shopify');

new Gulp(exports, {
  prefix: 'new-project'  
});
```

## Tasks

* `default` task will merge vendors, compile js & css and then watch for changes
* `vendor-js` task will merge vendor js
* `vendor-css` task will merge vendor css
* `js` task will compile source javascript
* `css` task will compile source scss

## Structure

Default `Dawn` theme project structure should be as follows:

    .
    ├── dev                         
    │   ├── js                      
    │   │   ├── sections 
    │   │   │   └── example.js      # Each section should have very own js
    │   │   └── core.js             # Global js used site-wide
    │   ├── sass    
    │   │   ├── components 
    │   │   │   └── example.scss    # Components like eg. rating
    │   │   ├── core 
    │   │   │   └── _vars.scss      # Css variables
    │   │   ├── sections 
    │   │   │   └── example.scss    # Each section should have very own css
    │   │   ├── _mixins.scss        # Common functions and mixins
    │   │   ├── _variables.scss     # Sass variables
    │   │   └── core.scss           # Core styles used site-wide
    │   ├── vendors  
    │   │   ├── js      
    │   │   │   └── example.min.js  # Vendor js files which will be merged into one
    │   │   └── css      
    │   │       └── example.min.css # Vendor css files which will be merged into one
    │   ├── Gulpfile.js
    │   ├── package.json
    │   └── package-lock.json
    └── ...

## Configuration

This is default configuration:

```js
new Gulp(exports, {
  // Destination directory for compiled files 
  dest: '../assets',
  // Prefix for compiled files
  prefix: 'custom',
  // Character for joining directory structured files
  glue: '.',
  // Split each source file to css file
  split: true,
  // Css config
  css: {
    // Source path for sass files
    src: 'sass/**/*',
    // Used for single output file (if split set to false)
    name: 'style',
    // Vendors source path      
    vendors: 'vendors/css/*.css',
    // Vendors output file name
    vendorsName: 'vendors',
    // Base directory where source files are stored
    baseDirectory: 'sass'
  },
  // Js config
  js: {
    // Source path for js files
    src: 'js/**/*',
    // Used for single output file (if split set to false)
    name: 'all',
    // Vendors source path      
    vendors: 'vendors/js/*.js',
    // Vendors output file name
    vendorsName: 'vendors',
    // Uglify output file
    uglify: true,
    // This prevent clean js from rendering to file
    onlyMinified: true,
    // Base directory where source js files are stored
    baseDirectory: 'js',
    // Options for babel compiler
    babelOptions: {
      presets: [
        ['@babel/env', {
          modules: false
        }]
      ],
      plugins: [
        ['@babel/plugin-transform-classes', {
          loose: false
        }]
      ]
    }
  }
})
```