export default {
  options: {
    minify: false,
    optimize: {
      comments: 'non-bang',
      charset: true,
      font: false
    },
    purge: {
      safeList: ['form', /^(a|span)$/, '#not-included', /#main-\d+/, '.not-included', /.combo-\d+/],
      includePaths: ['.'],
      excludePaths: [],
      sourceFiles: ['html']
    },
    layers: {
      order: [
        'theme',
        'reset',
        'base',
        'layout.containers',
        'layout.grid',
        'layout.flex',
        'layout.shortcuts',
        'shortcuts',
        'root'
      ]
    }
  }
};
