'use strict';
 var
    shims = require("./shim"),
    sharedModules = Object.keys(shims).concat([
    ]);
module.exports = function(grunt){
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    concat: {
      dist: {
        src: ["begin.js",
              "src/tools/*.js",
              "src/base/+(a)-*.js",
              "src/base/!(a-|aa-|aaa-)*.js",
              "src/geoms/*.js",
              "src/stats/*.js",
              "end.js"
              ],
        dest: "dist/<%= pkg.name %>.v.<%= pkg.version%>.js"
      },
      site: {
        src: ["begin.js",
              "src/tools/*.js",
              "src/base/+(a)-*.js",
              "src/base/!(a-|aa-|aaa-)*.js",
              "src/geoms/*.js",
              "src/stats/*.js",
              "end.js"
              ],
        dest: "../v3_site/ggd3/assets/js/<%= pkg.name %>.v.<%= pkg.version%>.js"
      },
      css: {
        src: [
          "css/*.css"
        ],
        dest: "../v3_site/ggd3/assets/css/ggd3style.css"
      },
      delta_css: {
        src: [ "css/*.css"],
        dest: "../../../flaskenv/delta/delta/static/css/ggd3style.css"
      }
      ,
      blog_css: {
        src: [
          "css/*.css"
        ],
        dest: "../../website/viz_plugin/static/css/ggd3style.css"
      },
      test: {
        "plot": "test/plot.js"
      }
    },
    jshint: {
      files: ["src/**/*.js",
      "!node_modules/**/*"],
      options: {
        jshintrc: ".jshintrc"
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
        build: {
        src: [
          "begin.js",
          "src/tools/*.js",
          "src/base/*.js",
          "src/geoms/*.js",
          "src/stats/*.js",
          "end.js"
        ],
        dest: 'build/<%= pkg.name %>.min.js'
      }
    },
    browserify: {
      all: {
        files: {
          "./<%= pkg.name%>.standalone.js": ["./browserified.js"],
          "../v3_site/ggd3/assets/js/<%= pkg.name%>.standalone.js": ['./browserified.js'],
          "../../website/viz_plugin/static/js/<%= pkg.name %>.standalone.js":['./browserified.js'],
          "../../../flaskenv/delta/delta/static/js/<%= pkg.name %>.standalone.js":['./browserified.js'],
        },
        options: {
          browserifyOptions: {
            transform: ['browserify-shim']
          },
          watch: false,
          keepAlive:false,
          debug: true
        }
      }
    },
    watch: {
      scripts: {
        files: [
          '*.js', "src/*/*.js", "src/*.js",
          "!dist/*",
          "css/*",
          ],
        tasks: ['concat', 'browserify', 'jshint'],
        options: {
          spawn: true,
          reload: false
        },  
      }
    },
  });
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-extract-sourcemap');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // default tasks
  grunt.registerTask('default', ["jshint", 'concat', 'watch']);

  // don't think I need this;
  grunt.registerTask('hint', ["jshint"]);
}
