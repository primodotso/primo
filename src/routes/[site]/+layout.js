import { getSupabase } from '@supabase/auth-helpers-sveltekit'
import { redirect } from '@sveltejs/kit'

export const load = async (event) => {
  event.depends('app:data')

  const { session, supabaseClient } = await getSupabase(event)
  if (!session) {
    throw redirect(303, '/auth')
  }

  const site_url = event.params['site'] 
  const {data:site} = await supabaseClient.from('sites').select().filter('url', 'eq', site_url).single()

  const page_url = 'index'
  const {data:page} = await supabaseClient.from('pages').select('*').match({ site: site.id, url: page_url }).single()

  // let {data} =  await supabaseClient.from('sites').select(`id, name, created_at, data, page:data->pages->index`).filter('id', 'eq', site.id)
  const [{data:pages}, {data:symbols}, {data:sections}] = await Promise.all([
    await supabaseClient.from('pages').select().match({site: site.id}),
    await supabaseClient.from('symbols').select().match({site: site.id}),
    await supabaseClient.from('sections').select('id, page, index, content, symbol (*)').match({page: page['id']}),
  ]) 

  const ordered_sections = sections?.sort((a, b) => {
    if (a.index === b.index) {
      return new Date(a.created_at) - new Date(b.created_at)
    } else {
      return a.index - b.index
    }
  })

  const ordered_pages = pages?.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const ordered_symbols = symbols?.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  return {
    site,
    pages: ordered_pages,
    page: page,
    sections: ordered_sections,
    symbols: ordered_symbols
  }
}