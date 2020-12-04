console.log('hi')
// some code from https://github.com/talos/jquery-svgpan/blob/master/jquery-svgpan.js
let sprocList
let svgEl
let szp
window.onload = () => {
  const view = document.querySelector('#view')
  const tables = document.querySelector('#tables')
  const sprocChange = document.querySelector('#sprocChange')
  svgEl = document.querySelector('#svg svg')
  szp = svgPanZoom(svgEl)
  resetZoom()
  view.onchange = changeView
  sprocChange.onchange = sprocChangeFn
  tables.onchange = tableChange
  sprocList = document.querySelectorAll('#sprocList li')
  for (const el of sprocList) {
    el.onclick = showSproc
  }
}

function resetZoom() {
  szp.fit()
  szp.center()
}

function changeView (evt) {
  const content = document.querySelector('#content')
  for (const el of content.children) {
    el.classList.toggle('hidden')
  }
  const tables = document.querySelector('#tables')
  tables.classList.toggle('hidden')
}

function tableChange (evt) {
  const t = Array.from(document.querySelectorAll('title')).filter(el => el.textContent==evt.target.value.replace('.','_'))
  const table = t[0].parentNode
  const bb=table.getBBox()
    , vbb=szp.getSizes().viewBox
    , x=vbb.width/2-bb.x-bb.width/2
    , y=vbb.height/2-bb.y-bb.height/2
    , rz=szp.getSizes().realZoom
    , zoom=vbb.width/bb.width
  console.log(`szp.panBy({x:${x*rz},y:${y*rz}})`)
  //szp.zoom(zoom)
}

function sprocChangeFn (evt) {
  let hideEls = sprocList
  for (const el of hideEls) {
    el.classList.remove('hidden')
  }
  hideEls = []
  switch(evt.target.value) {
    case 'added':
      hideEls = document.querySelectorAll('#sprocList li:not(.li-added)')
      break
    case 'removed':
      hideEls = document.querySelectorAll('#sprocList li:not(.li-removed)')
      break
    case 'modified':
      hideEls = document.querySelectorAll('#sprocList li:not(.li-modified)')
      break
  }
  for (const el of hideEls) {
    el.classList.add('hidden')
  }
}

function showSproc (evt) {
  const listEl = evt.target.id ? evt.target : evt.target.parentNode
  const sproc = erd.sprocs[listEl.id]
  const disp = document.querySelector('#diff')
  let str
  let linenum = 0
  const lines = t => t.value.replace(/\n$/,'').split('\n').map((l, i) => `<pre data-ln="${linenum + i}">${l}</pre>`).join('')
  if (sproc.diff) {
    str = sproc.diff.map((d, i) => {
      const r =  `<div class="${d.added? 'added':d.removed?'removed':''}">${lines(d)}</div>`
      if (!d.removed) linenum += d.count
      return r
    }).join('')
  } else {
    str = `<div class="">${sproc.body.split('\n').map((l, i) => `<pre data-ln="${linenum + i}">${l}</pre>`).join('')}</div>`
  }
  disp.innerHTML = str
}

function code(show) {
  let els = document.querySelectorAll('.right:last-child div')
  for (const el of els) {
    el.classList.remove('hidden')
  }
  els = document.querySelectorAll(`.right:last-child div.${show}`)
  for (const el of els) {
    el.classList.add('hidden')
  }
}

