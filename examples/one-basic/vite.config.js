// import { one } from 'one/vite'

module.exports = ({
  ssr: {
    // noExternal: true
    // external: ['@vxrn/vendor', 'react', 'react-dom', '@tanstack/react-query'],
    external: true,
  },

  plugins: [
    require('/Users/z/Projects/vxrn/packages/one/dist/cjs/vite.js').one({
      web: {
        defaultRenderMode: 'ssg',
      },
    }),
  ],
})
