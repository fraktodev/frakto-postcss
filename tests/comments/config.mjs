export default {
  outputs: {
    'output.none.css': {
      minify: false,
      optimize: false,
      purge: false
    },
    'output.all.css': {
      minify: false,
      optimize: {
        comments: 'all',
        charset: false
      },
      purge: false
    },
    'output.non-bang.css': {
      minify: false,
      optimize: {
        comments: 'non-bang',
        charset: false
      },
      purge: false
    },
    'output.min.css': {
      minify: true,
      optimize: {
        comments: 'none',
        charset: false
      },
      purge: false
    }
  }
};
