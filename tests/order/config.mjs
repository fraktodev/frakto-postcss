export default {
  outputs: {
    'output.frakto.css': {
      minify: false,
      optimize: {
        order: 'frakto',
        charset: false
      },
      purge: false
    },
    'output.alphabetical.css': {
      minify: false,
      optimize: {
        order: 'alphabetical',
        charset: false
      },
      purge: false
    },
    'output.concentric.css': {
      minify: false,
      optimize: {
        order: 'concentric',
        charset: false
      },
      purge: false
    },
    'output.smacss.css': {
      minify: false,
      optimize: {
        order: 'smacss',
        charset: false
      },
      purge: false
    },
    'output.none.css': {
      minify: false,
      optimize: {
        order: false,
        charset: false
      },
      purge: false
    }
  }
};
