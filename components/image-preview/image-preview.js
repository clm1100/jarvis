/*
 * image-preview
 * https://github.com/mambahao/image-preview
 * Copyright (c) Justin Hao
 */
(function () {
  var defaults = function (defaults, options) {
    for (var key in options) {
      if (options.hasOwnProperty(key))
        defaults[key] = options[key];
    }

    return defaults;
  };

  var ImagePreview = function (element, options) {
    if (!this.isSupported)
      throw new Error('Older browsers are not supported.');

    var opts = typeof options !== 'undefined' ? options : {};

    if (typeof opts !== 'object' || Array.isArray(opts))
      throw new Error('Options must be passed as object!');

    this.setElements(element, opts);
    this.bindEvents();
  };

  ImagePreview.prototype = {
    defaults: {
      placeholder: '.image-placeholder',
      width: 'auto',
      height: 'auto',
      imgClass: 'img-load',
      method: 'html',
      callback: null
    },

    isSupported: function () {
      return window.File && window.FileReader && window.FileList && window.Blob;
    },

    setElements: function (element, options) {
      this.options = defaults(this.defaults, options);
      this.$element = document.querySelectorAll(element)[0];
      this.$placeholder = document.querySelectorAll(this.options.placeholder)[0];
    },

    bindEvents: function () {
      this.$element.addEventListener('change', this.render.bind(this), false);
    },

    render: function (e) {
      var uploader = e.currentTarget,
          reader = new FileReader(),
          self = this,
          o = this.options;

      reader.onload = (function (file) {
        return self[o.method === 'css' ? 'setBackground' : 'setImage'].bind(self);
      }(uploader.files[0]));

      reader.readAsDataURL(uploader.files[0]);
    },

    setImage: function (e) {
      var o = this.options;

      var image = '<img src="' + e.target.result + '" width="' + o.width + '" height="' + o.height + '" class="' + o.imgClass + '">';

      if (o.method === 'html') {
        this.$placeholder.innerHTML = image;
        if (typeof o.callback === 'function')
          o.callback();
        return;
      }

      if (o.method === 'append') {
        this.$placeholder.innerHTML = this.$placeholder.innerHTML + image;
        if (typeof o.callback === 'function')
          o.callback();
        return;
      }

      throw new Error('Only html and append methods are allowed!');
    },

    setBackground: function (e) {
      var o = this.options;
      this.$placeholder.style.backgroundImage = 'url(' + e.target.result + ')';
      if (typeof o.callback === 'function')
        o.callback();
    }
  };

  window.ImagePreview = ImagePreview;
})();