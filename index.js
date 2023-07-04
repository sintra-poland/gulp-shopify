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
const clean = require('gulp-clean-css');
const path = require('path');
const fs = require('fs');
const colors = require('colors');
const semver = require('semver');
const mediaQueriesSplitter = require('gulp-media-queries-splitter');

class Gulp
{
  constructor (_exports, config)
  {
    this.config = this.deepMerge(this.defaults(), config ? config : {});
    this.checkVersion();

    this.task('js', this.taskJs.bind(this));
    this.task('css', this.taskCss.bind(this));

    this.task('vendor-css', this.taskVendorCss.bind(this));
    this.task('vendor-js', this.taskVendorJs.bind(this));

    this.task('watch', this.taskWatcher.bind(this));

    _exports.default = this.taskDefault();
  }

  task (name, callback)
  {
    task(name, callback);
  }

  checkVersion ()
  {
    if (this.config.skipVersionCheck) {
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(__dirname + '/package.json').toString());
      const packageLockJson = JSON.parse(fs.readFileSync(process.env.INIT_CWD + '/package-lock.json').toString());
      const packageVersion = packageJson.version;
      const packageLockVersion = packageLockJson.dependencies['@sintra-poland/gulp-shopify'].version;

      if (semver.gt(packageLockVersion, packageVersion)) {
        console.log('');
        console.log('There is newer version of ' + colors.cyan('@sintra-poland/gulp-shopify') + ' in ' + colors.cyan('package-lock.json'));
        console.log('New version: ' + colors.green(packageLockVersion));
        console.log('Old version: ' + colors.yellow(packageVersion));
        console.log('In order to continue please run ' + colors.cyan('npm install'));

        process.exit(0);
      }
    } catch (e) {
      console.log(colors.red('Failed to check @sintra-poland/gulp-shopify version'));
    }
  }

  defaults ()
  {
    return {
      lineBreaks: true,
      skipVersionCheck: false,
      prefix: 'custom',
      glue: '.',
      dest: '../assets',
      split: true,
      css: {
        splitCoreMedia: false,
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
        group: true,
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

    const groupedJs = [];

    return src(config.js.src)
      .pipe(foreach(function (stream, file) {
        if (file.isDirectory()) {
          return stream;
        }

        const name = path.basename(file.history[0]);
        const dirs = [];
        let type = '';
        let dir = path.dirname(file.history[0]);
        let jsSrc = file.history[0];
        let wasGrouped = false;

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

        // Group javascript
        if (config.js.group && dirs.length > 1) {
          const group = dirs.slice(-2).reverse();
          const grouped = group.join(config.glue);
          const groupDirectory = dir + '/' + config.js.baseDirectory + '/' + group.join('/');

          if (groupedJs.indexOf(grouped) > -1) {
            return stream;
          }

          groupedJs.push(grouped);

          jsSrc = [];

          // Add js files from directories first (sorted alphabetically)
          fs.readdirSync(groupDirectory).sort().forEach(filename => {
            if (fs.lstatSync(groupDirectory + '/' + filename).isDirectory()) {
              fs.readdirSync(groupDirectory + '/' + filename).sort().forEach(filenameInDir => {
                jsSrc.push(groupDirectory + '/' + filename + '/' + filenameInDir);
              });
            }
          });

          // Add rest of the files (sorted alphabetically)
          fs.readdirSync(groupDirectory).sort().forEach(filename => {
            if (!fs.lstatSync(groupDirectory + '/' + filename).isDirectory() && filename.endsWith('.js')) {
              jsSrc.push(groupDirectory + '/' + filename);
            }
          });

          renamed = grouped + '.js';
          wasGrouped = true;
        } else if (dirs.length > 0) {
          renamed = dirs.reverse().join(config.glue) + config.glue + renamed;
        }

        if (config.prefix) {
          renamed = config.prefix + config.glue + renamed;
        }

        let result = src(jsSrc)
          .pipe(plumber())
          .pipe(babel(config.js.babelOptions));

        if (wasGrouped) {
          result = result.pipe(concat(renamed));
        }

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
      let output = src(config.css.src)
        .pipe(sass({
          outputStyle: 'compressed'
        }))
        .pipe(autoprefixer());

      if (config.lineBreaks) {
        output = output.pipe(clean({
          format: 'keep-breaks'
        }))
      }

      return output.pipe(rename(config.css.name + '.min.css'))
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

        let output = src(file.history[0])
          .pipe(sass({
            outputStyle: 'compressed'
          }))
          .pipe(autoprefixer());

        if (config.lineBreaks) {
          output = output.pipe(clean({
            format: {
              breaks: {
                afterAtRule: true,
                afterBlockBegins: true,
                afterBlockEnds: true,
                afterComment: true,
                afterRuleEnds: true,
                beforeBlockEnds: true
              },
              breakWith: 'unix'
            }
          }))
        } else {
          output = output.pipe(clean({
            level: {
              1: {
                all: true,
                normalizeUrls: false
              },
              2: {
                all: false,
                restructureRules: false
              }
            }
          }))
        }


        if( config.css.splitCoreMedia && renamed.indexOf('core.') > -1 ) {
          output = output.pipe(mediaQueriesSplitter([
            {media: ['none', {min: '0px', minUntil: '599px', max: '9999px'}], filename: renamed.replace('.min.css', '.mobile.min.css') },
            {media: {min: '600px'}, filename: renamed.replace('.min.css', '.desktop.min.css')},
          ]));
        } else {
          output = output.pipe(rename(renamed))
        }

        return output.pipe(dest(config.dest));
          
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