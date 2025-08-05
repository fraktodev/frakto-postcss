export default {
  options: {
    minify: false,
    optimize: {
      charset: false,
      mediaQueries: true
    },
    purge: false,
    layers: {
      orphansName: 'medias',
      order: ['theme', 'medias']
    }
  }
};
