'use strict';

const { src, dest, watch, parallel, series, task } = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const autoprefixer = require('gulp-autoprefixer');
const rename = require('gulp-rename');
const foreach = require('gulp-foreach');
const babel = require('gulp-babel');
const plumber = require('gulp-plumber');
const minify = require('gulp-minify');
const uglify = require('gulp-uglify');
const concat = require('gulp-concat');
const path = require('path');

class Gulp
{
  constructor (_exports, config)
  {
    task('js', this.taskJs.bind(this));
    task('css', this.taskCss.bind(this));

    task('vendor-css', this.taskVendorCss.bind(this));
    task('vendor-js', this.taskVendorJs.bind(this));

    task('watch', this.taskWatcher.bind(this));

    _exports.default = this.taskDefault();

    this.config = this.deepMerge(this.defaults(), config ? config : {});
  }

  defaults ()
  {
    return {
      prefix: 'custom',
      glue: '.',
      dest: '../assets',
      split: true,
      css: {
        src: 'sass/**/*',
        name: 'style',
        vendors: 'vendors/css/*.css',
        vendorsName: 'vendors',
        baseDirectory: 'sass'
      },
      js: {
        src: 'js/**/*',
        name: 'all',
        vendors: 'vendors/js/*.js',
        vendorsName: 'vendors',
        uglify: true,
        onlyMinified: true,
        babelOptions: {
          presets: [
            ['@babel/env', {
              modules: false,
              targets: {
                chrome: 60
              }
            }]
          ]
        },
        baseDirectory: 'js'
      }
    }
  }

  isObject (item)
  {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

  deepMerge (target, ...sources)
  {
    if (!sources.length) {
      return target;
    }

    const source = sources.shift();

    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) {
            Object.assign(target, { [key]: {} });
          }
          this.deepMerge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this.deepMerge(target, ...sources);
  }

  taskJs ()
  {
    const config = this.config;

    if (!config.split) {
      let result = src(config.js.src)
        .pipe(plumber())
        .pipe(babel(config.js.babelOptions))
        .pipe(concat(config.js.name + '.js'));

      if (!config.js.onlyMinified) {
        result = result.pipe(dest(config.dest));
      }

      result = result.pipe(rename(config.js.name + '.min.js'));

      if (config.js.uglify) {
        result = result.pipe(uglify());
      } else {
        result = result.pipe(minify());
      }

      result = result.pipe(dest(config.dest));

      return result;
    }

    return src(config.js.src)
      .pipe(foreach(function (stream, file) {
        if (file.isDirectory()) {
          return stream;
        }

        const name = path.basename(file.history[0]);
        const dirs = [];
        let type = '';
        let dir = path.dirname(file.history[0]);

        while (true) {
          type = path.basename(dir);
          dir = path.dirname(dir);

          if (type === config.js.baseDirectory) {
            break;
          } else if (type === '') {
            throw 'Invalid directory structure, missing ' + config.js.baseDirectory;
          }

          dirs.push(type);
        }

        let renamed = name;

        if (dirs.length > 0) {
          renamed = dirs.reverse().join(config.glue) + config.glue + renamed;
        }

        if (config.prefix) {
          renamed = config.prefix + config.glue + renamed;
        }

        let result = src(file.history[0])
          .pipe(plumber())
          .pipe(babel(config.js.babelOptions));

        if (!config.js.onlyMinified) {
          result = result.pipe(rename(renamed))
            .pipe(dest(config.dest));
        }

        result = result.pipe(rename(renamed.replace('.js', '.min.js')));

        if (config.js.uglify) {
          result = result.pipe(uglify());
        } else {
          result = result.pipe(minify());
        }

        result = result.pipe(dest(config.dest));

        return result;
      }));
  }

  taskCss ()
  {
    const config = this.config;

    if (!config.split) {
      return src(config.css.src)
        .pipe(sass({
          outputStyle: 'compressed'
        }))
        .pipe(autoprefixer())
        .pipe(rename(config.css.name + '.min.css'))
        .pipe(dest(config.dest));
    }

    return src(config.css.src)
      .pipe(sass().on('error', sass.logError))
      .pipe(foreach(function (stream, file) {
        if (file.isDirectory()) {
          return stream;
        }

        const name = path.basename(file.history[0]);
        const dirs = [];
        let type = '';
        let dir = path.dirname(file.history[0]);

        while (true) {
          type = path.basename(dir);
          dir = path.dirname(dir);

          if (type === config.css.baseDirectory) {
            break;
          } else if (type === '') {
            throw 'Invalid directory structure, missing ' + config.css.baseDirectory;
          }

          dirs.push(type);
        }

        let renamed = name.replace('.scss', '.min.css');

        if (dirs.length > 0) {
          renamed = dirs.reverse().join(config.glue) + config.glue + renamed;
        }

        if (config.prefix) {
          renamed = config.prefix + config.glue + renamed;
        }

        return src(file.history[0])
          .pipe(sass({
            outputStyle: 'compressed'
          }))
          .pipe(autoprefixer())
          .pipe(rename(renamed))
          .pipe(dest(config.dest));
      }));
  }

  taskVendorJs ()
  {
    let name = this.config.js.vendorsName + '.min.js';

    if (this.config.prefix) {
      name = this.config.prefix + this.config.glue + name;
    }

    return src(this.config.js.vendors)
      .pipe(concat(name))
      .pipe(dest(this.config.dest));
  }

  taskVendorCss ()
  {
    let name = this.config.css.vendorsName + '.min.css';

    if (this.config.prefix) {
      name = this.config.prefix + this.config.glue + name;
    }

    return src(this.config.css.vendors)
      .pipe(concat(name))
      .pipe(dest(this.config.dest));
  }

  taskWatcher ()
  {
    watch(this.config.css.src, parallel('css'));
    watch(this.config.js.src, parallel('js'));
    watch(this.config.css.vendors, parallel('vendor-css'));
    watch(this.config.js.vendors, parallel('vendor-js'));
  }

  taskDefault ()
  {
    return series(
      parallel('vendor-css', 'vendor-js'),
      parallel('css', 'js'),
      'watch'
    );
  }
}

module.exports = { Gulp };