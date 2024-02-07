import { dirname, extname, basename } from 'path'
import collections from '@metalsmith/collections'
import markdown from '@metalsmith/markdown'
import postcss from '@metalsmith/postcss'
import layouts from '@metalsmith/layouts'
import { fileURLToPath } from 'node:url'
import Metalsmith from 'metalsmith'
import { readdirSync } from 'fs'
import slugify from 'slugify'

const __dirname = dirname(fileURLToPath(import.meta.url))
const folders = readdirSync('./Przepisy', { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory() && /^\d{2} /.test(dirent.name))
  .reduce((acc, dirent) => {
    acc[dirent.name.replace(/^\d{2} /, '')] = dirent.name + '/*.md'
    return acc
  }, {})
const t1 = performance.now()

const hideTodos = (files, metalsmith, done) => {
  const keys = Object.keys(files)
  keys.forEach((filepath) => {
    if (files[filepath].tags && files[filepath].tags.includes('todo')) {
      delete files[filepath]
    }
  })
  done()
}
const structure = (files, metalsmith, done) => {
  const keys = Object.keys(files)
  keys.forEach((filepath) => {
    let name = filepath
      .replace(/^\d{2} /, '')
      .split('/')
      .map((e) => slugify(e, { lower: true, locale: 'pl' }))
      .join('/')
    Object.assign(files[filepath], {
      permalink: name,
      title: basename(filepath, extname(filepath)),
    })
    if (name !== filepath) {
      Object.defineProperty(
        files,
        name,
        Object.getOwnPropertyDescriptor(files, filepath),
      )
      delete files[filepath]
    }
  })
  done()
}

const wikilinks = (files, metalsmith, done) => {
  const keys = Object.keys(files)
  keys.forEach((filepath) => {
    let file = files[filepath]
    let content = file.contents.toString()
    let wikilinks = content.match(/\[\[([^\]]+)\]\]/g)
    if (wikilinks) {
      wikilinks.forEach((wikilink) => {
        let title = wikilink.replace(/\[\[([^\]]+)\]\]/, '$1')
        let linked = keys.find((filepath) =>
          files[filepath].path.includes(`${title}.md`),
        )
        if (linked) {
          let link = files[linked].permalink
          content = content.replace(wikilink, `<a href="/${link}">${title}</a>`)
        }
      })
      file.contents = Buffer.from(content)
    }
  })
  done()
}

const callouts = (files, metalsmith, done) => {
  const keys = Object.keys(files)
  keys.forEach((filepath) => {
    let file = files[filepath]
    let content = file.contents.toString()
    content = content.replace(
      /(?:(?!<blockquote>)[\s\S])*?\[\!(.*?)\](?:(?!<\/blockquote>)[\s\S])*?/g,
      function (match, type) {
        type = type.trim()
        match = `blockquote class="${type}"` + match.substring(10)
        match = match.replace(`[!${type}]`, '')
        return match
      },
    )
    file.contents = Buffer.from(content)
  })
  done()
}

Metalsmith(__dirname)
  .source('./Przepisy')
  .destination('./dist')
  .use(
    postcss({
      plugins: {
        'postcss-import': {},
        'postcss-nesting': {},
        tailwindcss: {},
        autoprefixer: {},
      },
    }),
  )
  .clean(true)
  .metadata({
    site_author: 'Krzysztof Goliński',
    site_title: 'Przepisy',
    site_language: 'pl-PL',
    site_description: 'Książka kucharska',
    site_url: 'https://przepisy.golinski.org',
    site_logo: '/assets/img/sushi.svg',
    site_logo_raster: '/assets/img/sushi.png',
    site_logo_source: 'Freepik Stories',
    site_github_repository_url: 'https://github.com/kgolinski/przepisy',
    site_year: new Date().getFullYear(),
  })
  .use(hideTodos)
  .use(collections(folders))
  .use(markdown())
  .use(structure)
  .use(wikilinks)
  .use(callouts)
  .use(
    layouts({
      directory: '.',
      default: 'layout.hbs',
      pattern: '**/*.html',
      engineOptions: {
        helpers: {
          slugify: (string) => {
            return slugify(string, { lower: true, locale: 'pl' })
          },
          eq: (a, b) => {
            return a === b
          },
        },
      },
    }),
  )
  .build((err, files) => {
    if (err) throw err
    console.log(
      `Built ${Object.keys(files).length} files in ${((performance.now() - t1) / 1000).toFixed(1)}s`,
    )
  })
