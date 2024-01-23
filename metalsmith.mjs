import { fileURLToPath } from 'node:url'
import { dirname, extname, basename } from 'path'
import Metalsmith from 'metalsmith'
import collections from '@metalsmith/collections'
import layouts from '@metalsmith/layouts'
import markdown from '@metalsmith/markdown'
import slugify from 'slugify'

const __dirname = dirname(fileURLToPath(import.meta.url))
const t1 = performance.now()

const structure = (files, metalsmith, done) => {
  const keys = Object.keys(files)
  keys.forEach(filepath => {
    let name = filepath.replace(/^\d{2} /, '').split('/').map(e => slugify(e, { lower: true, locale:'pl'})).join('/')
    Object.assign(files[filepath], {
      permalink: name,
      title: basename(filepath, extname(filepath))
    })
    if (name !== filepath) {
      Object.defineProperty(files, name, Object.getOwnPropertyDescriptor(files, filepath));
      delete files[filepath];
    }
  })
  done()
}

const wikilinks = (files, metalsmith, done) => {
  const keys = Object.keys(files)
  keys.forEach(filepath => {
    let file = files[filepath]
    let content = file.contents.toString()
    let wikilinks = content.match(/\[\[([^\]]+)\]\]/g)
    if (wikilinks) {
      wikilinks.forEach(wikilink => {
        let title = wikilink.replace(/\[\[([^\]]+)\]\]/, '$1')
        let linked = keys.find(filepath => files[filepath].path.includes(`${title}.md`));
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

Metalsmith(__dirname)
  .source('./Przepisy')
  .destination('./dist')
  .clean(true)
  .use(collections({
    'Zupy': '01 Zupy/*.md',
    'Dania główne': '02 Dania główne/*.md',
    'Dodatki': '03 Dodatki/*.md',
    'Desery': '04 Desery/*.md',
    'Przetwory': '05 Przetwory/*.md',
    'Notatki': '06 Notatki/*.md',
  }))
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
    site_github_repository_nwo: 'kgolinski/przepisy',
    site_github_owner_url: 'https://github.com/kgolinski',
    site_github_owner_name: 'kgolinski'

  })
  .use(markdown())
  .use(structure)
  .use(wikilinks)
  .use(layouts({
      directory: "layouts",
      default: "layout.hbs",
      pattern: '**/*.html',
      engineOptions: {
        helpers: {
          slugify: (string) => {
            return slugify(string, { lower: true, locale:'pl'})
          },
          eq: (a, b) =>{
            return a === b
          },
        }
      }
    }))
  .build((err) => {
    if (err) throw err
    console.log(`Build success in ${((performance.now() - t1) / 1000).toFixed(1)}s`)
  });
