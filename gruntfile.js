module.exports = function(grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    eslint: {
      target: ['assets/javascripts/*.js', 'app.js', 'routes/*.js', 'models/*.js']
    },

    bowercopy: {
      options: { srcPrefix: 'components' },
      // Javascript
      libs: {
        options: { destPrefix: 'assets/javascripts/libs' },
        files: {
          'jquery.js': 'jquery/dist/jquery.min.js',
          'bootstrap.js': 'bootstrap/dist/js/bootstrap.min.js',
          'metis-menu.js': 'metisMenu/dist/metisMenu.min.js',
          'raphael.js': 'raphael/raphael-min.js',
          'sb-admin.js': 'startbootstrap-sb-admin-2/dist/js/sb-admin-2.js',
          'doT.js': 'doT/doT.min.js',
          'moment.js': 'moment/min/moment-with-locales.min.js',
          'bootstrap-datepicker.js': 'bootstrap-datepicker/dist/js/bootstrap-datepicker.min.js',
          'bootstrap-datepicker.zh-CN.js': 'bootstrap-datepicker/dist/locales/bootstrap-datepicker.zh-CN.min.js',
          'bootstrap-datetimepicker.js': 'eonasdan-bootstrap-datetimepicker/build/js/bootstrap-datetimepicker.min.js',
          'bootstrap.switch.js': 'bootstrap-switch/dist/js/bootstrap-switch.min.js',
          'bootstrap-multiselect.js':'bootstrap-multiselect/dist/js/bootstrap-multiselect.js',
          'bootstrap-typeahead.js':'bootstrap3-typeahead/bootstrap3-typeahead.min.js',
          'bootstrap-dialog.js': 'bootstrap3-dialog/dist/js/bootstrap-dialog.min.js',
          'jquery.animate.js': 'jquery.animate.js/jquery.animate.min.js',
          'jquery.pep.js': 'jquery.pep/src/jquery.pep.js',
          'slick.js': 'slick.js/slick/slick.min.js',
          'url.js': 'js-url/url.min.js',
          'image-preview.js': 'image-preview/image-preview.min.js',
          'spark-md5.js': 'spark-md5/spark-md5.min.js',
          'async.js': 'async/dist/async.min.js',
          'masonry.js': 'masonry/dist/masonry.pkgd.min.js',
          'jquery.infinitescroll.js': 'jquery-infinite-scroll/jquery.infinitescroll.min.js',
          'imagesloaded.js': 'imagesloaded/imagesloaded.pkgd.min.js',
          'sortable.js': 'Sortable/Sortable.min.js',
          'lightbox.js': 'lightbox2/dist/js/lightbox.min.js',
          'jquery.sortable.js': 'Sortable/jquery.binding.js',
          'social-network-text.js': 'social-network-text/social-network-text.min.js',
          'pace.js': 'pace/pace.min.js',
          'datatables.js': 'datatables/media/js/jquery.dataTables.min.js',
          'datatables-chinese.json': 'datatables-plugins/i18n/Chinese.lang',
          'datatables-select.js': 'datatables-plugins/pagination/select.js',
          'datatables.bootstrap.js': 'datatables-plugins/integration/bootstrap/3/dataTables.bootstrap.min.js'
        }
      },
      fonts: {
        files: {
          'assets/fonts': ['bootstrap/dist/fonts/*', 'fontawesome/fonts/fontawesome*', 'slick.js/slick/fonts/*']
        }
      },
      images: {
        files: {
          'assets/images': ['datatables/media/images/*', 'lightbox2/dist/images/*']
        }
      },
      // css
      css: {
        options: { destPrefix: 'assets/stylesheets' },
        files: {
          'bootstrap.css': 'bootstrap/dist/css/bootstrap.min.css',
          'sb-admin.css': 'startbootstrap-sb-admin-2/dist/css/sb-admin-2.css',
          'bootstrap-datepicker3.css': 'bootstrap-datepicker/dist/css/bootstrap-datepicker3.min.css',
          'bootstrap-datetimepicker.css': 'eonasdan-bootstrap-datetimepicker/build/css/bootstrap-datetimepicker.min.css',
          'bootstrap.switch.css': 'bootstrap-switch/dist/css/bootstrap3/bootstrap-switch.min.css',
          'bootstrap-dialog.css': 'bootstrap3-dialog/dist/css/bootstrap-dialog.min.css',
          'metis-menu.css': 'metisMenu/dist/metisMenu.min.css',
          'font-awesome.css': 'fontawesome/css/font-awesome.min.css',
          'slick.css': 'slick.js/slick/slick.css',
          'animate.css': 'animate.css/animate.min.css',
          'lightbox.css': 'lightbox2/dist/css/lightbox.css',
          'datatables.css': 'datatables/media/css/jquery.dataTables.min.css',
          'datatables.bootstrap.css': 'datatables-plugins/integration/bootstrap/3/dataTables.bootstrap.css',
          'datatables.fontawesome.css': 'datatables-plugins/integration/font-awesome/dataTables.fontAwesome.css',
          'bootstrap-multiselect.css':'bootstrap-multiselect/dist/css/bootstrap-multiselect.css'
        }
      }
    },

    'string-replace': {
      js: {
        files: { 'assets/javascripts/libs/': [
          'assets/javascripts/libs/async.js',
          'assets/javascripts/libs/lightbox.js',
          'assets/javascripts/libs/jquery.js'
        ] },
        options: {
          replacements: [
            { pattern: '//# sourceMappingURL=dist/async.min.map', replacement: '' },
            { pattern: '//# sourceMappingURL=lightbox.min.map', replacement: '' },
            { pattern: '//# sourceMappingURL=jquery.min.map', replacement: '' }
          ]
        }
      },
      ueditor: {
        files: {
          'assets/javascripts/libs/ueditor/dialogs/image/': 'assets/javascripts/libs/ueditor/dialogs/image/image.js'
        },
        options: {
          replacements: [{
            pattern: " + (list[i].url.indexOf('?') == -1 ? '?noCache=':'&noCache=') + (+new Date()).toString(36) ",
            replacement: ''
          }]
        }
      },
      datatables: {
        files: {
          'assets/javascripts/libs/': 'assets/javascripts/libs/datatables-chinese.json'
        },
        options: {
          replacements: [{
            pattern: '处理中...',
            replacement: "<span class='fa fa-clock-o'></span>&nbsp;处理中..."
          }]
        }
      }
    },

    'json-minify': {
      build: { files: 'assets/javascripts/libs/*.json' }
    },

    uglify: {
      app: {
        files: [{
          expand: true,
          cwd: 'assets/javascripts',
          src: '*.js',
          dest: 'public/javascripts'
        }]
      },
      build:{
        files:{
          'public/javascripts/libs/libraries.js': [
            'assets/javascripts/libs/modernizr-custom.js',
            'assets/javascripts/libs/jquery.js',
            'assets/javascripts/libs/bootstrap.js',
            'assets/javascripts/libs/metis-menu.js',
            'assets/javascripts/libs/raphael.js',
            'assets/javascripts/libs/sb-admin.js',
            'assets/javascripts/libs/doT.js',
            'assets/javascripts/libs/moment.js',
            'assets/javascripts/libs/bootstrap-datepicker.js',
            'assets/javascripts/libs/bootstrap-datepicker.zh-CN.js',
            'assets/javascripts/libs/bootstrap-datetimepicker.js',
            'assets/javascripts/libs/bootstrap.switch.js',
            'assets/javascripts/libs/bootstrap-typeahead.js',
            'assets/javascripts/libs/bootstrap-dialog.js',
            'assets/javascripts/libs/bootstrap-multiselect.js',
            'assets/javascripts/libs/jquery.animate.js',
            'assets/javascripts/libs/jquery.pep.js',
            'assets/javascripts/libs/url.js',
            'assets/javascripts/libs/slick.js',
            'assets/javascripts/libs/image-preview.js',
            'assets/javascripts/libs/spark-md5.js',
            'assets/javascripts/libs/async.js',
            'assets/javascripts/libs/masonry.js',
            'assets/javascripts/libs/jquery.infinitescroll.js',
            'assets/javascripts/libs/imagesloaded.js',
            'assets/javascripts/libs/sortable.js',
            'assets/javascripts/libs/jquery.sortable.js',
            'assets/javascripts/libs/social-network-text.js',
            'assets/javascripts/libs/lightbox.js',
            'assets/javascripts/libs/pace.js',
            'assets/javascripts/libs/datatables.js',
            'assets/javascripts/libs/datatables-select.js',
            'assets/javascripts/libs/datatables.bootstrap.js'
          ]
        }
      }
    },

    cssmin: {
      build: {
        files: {
          'public/stylesheets/application.css': [
            'assets/stylesheets/bootstrap.css',
            'assets/stylesheets/sb-admin.css',
            'assets/stylesheets/bootstrap-datepicker3.css',
            'assets/stylesheets/bootstrap.switch.css',
            'assets/stylesheets/bootstrap-dialog.css',
            'assets/stylesheets/bootstrap-multiselect.css',
            'assets/stylesheets/metis-menu.css',
            'assets/stylesheets/font-awesome.css',
            'assets/stylesheets/slick.css',
            'assets/stylesheets/animate.css',
            'assets/stylesheets/slick-custom.css',
            'assets/stylesheets/lightbox.css',
            'assets/stylesheets/pace-custom.css',
            'assets/stylesheets/datatables.css',
            'assets/stylesheets/datatables.bootstrap.css',
            'assets/stylesheets/datatables.fontawesome.css',
            'assets/stylesheets/application.css'
          ]
        }
      }
    },

    clean: { src: [
      'public/images/**',
      'public/fonts/**',
      'public/javascripts/*.js',
      'public/javascripts/*.map',
      'public/javascripts/libs/*.js',
      'public/stylesheets/*.css',
      'public/stylesheets/*.map'
    ] },

    copy: {
      js: {
        cwd: 'assets/javascripts/libs',
        src: ['*.map', '*.json'],
        dest: 'public/javascripts/libs',
        expand: true
      },
      ueditor: {
        cwd: 'assets/javascripts/libs/ueditor',
        src: ['**'],
        dest: 'public/javascripts/libs/ueditor',
        expand: true
      },
      css: {
        cwd: 'assets/stylesheets',
        src: ['*.map'],
        dest: 'public/stylesheets',
        expand: true
      },
      fonts: {
        cwd: 'assets/fonts',
        src: ['*.otf', '*.eot', '*.svg', '*.ttf', '*.woff', '*.woff2'],
        dest: 'public/fonts',
        expand: true
      },
      img: {
        cwd:'assets/images',
        src:['**'],
        dest:'public/images',
        expand:true
      }
    }
  });

  // 加载标准 copy/clean/replace/grunt 插件
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-string-replace');

  // 载入 eslint 插件，用于 JS 代码检查
  grunt.loadNpmTasks('grunt-eslint');

  // 加载 bowercopy 任务的插件, 用于 copy bower 的文件到 css js 目录
  grunt.loadNpmTasks('grunt-bowercopy');

  // 载入 uglify 插件，用于 JS 压缩
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // 载入 cssmin 插件用于 css 压缩
  grunt.loadNpmTasks('grunt-contrib-cssmin');

  // 载入 json-minify 插件用于 json 压缩
  grunt.loadNpmTasks('grunt-json-minify');

  // 默认被执行的任务列表。
  grunt.registerTask('default', ['eslint', 'bowercopy', 'string-replace', 'json-minify', 'clean', 'copy', 'uglify', 'cssmin']);
};
