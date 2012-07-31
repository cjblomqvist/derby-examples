var derby = require('derby')
  , app = derby.createApp(module)
  , get = app.get

derby.use(require('derby-ui-boot'))
derby.use(require('../../ui'))

var pages = [
  {url: '/', title: 'Home'}
, {url: '/people', title: 'People', requires_access: true}
, {url: '/people/new', title: 'Add somebody', requires_access: true}
]

function render(name, page) {
  var ctx = {
    pages: pages
  , activeUrl: page.params.url
  }
  page.render(name, ctx)
}

get('/', function(page, model) {
  render('home', page)
})

get('/people', function(page, model) {
  model.subscribe('people', 'conf.main.directoryIds', function(err, people) {
    model.refList('_people', people, 'conf.main.directoryIds')
    render('people', page)
  })
})

function renderEdit(page, model, id) {
  model.subscribe('people.' + id, function(err, person) {
    model.ref('_person', person)
    render('edit', page)
  })
}

get('/people/:id', function(page, model, params) {
  var id = params.id
  model.del('_newId')
  model.del('_nameError')
  if (id === 'new') {
    model.async.incr('peopleCount', function(err, count) {
      id = count.toString()
      model.set('_newId', id)
      renderEdit(page, model, id)
    })
  } else {
    renderEdit(page, model, id)
  }
})

app.ready(function(model) {
  var history = app.view.history

  app.done = function() {
    if (!model.get('_person.name')) {
      var checkName = function(value) {
        if (!value) return
        model.del('_nameError')
        model.removeListener('_person.name', checkName)
      }
      model.on('set', '_person.name', checkName)
      model.set('_nameError', true)
      document.getElementById('name').focus()
      return
    }

    var newId = model.get('_newId')
    if (newId != null) model.push('conf.main.directoryIds', newId)
    history.push('/people')
  }

  app.cancel = function() {
    history.back()
  }

  app.deletePerson = function() {
    model.async.get('conf.main.directoryIds', function(err, ids) {
      if (ids) {
        var id = model.get('_person.id')
          , i = ids.indexOf(id)
        if (i > -1) model.remove('conf.main.directoryIds', i)
      }
      history.back()
    }) 
  }
  
  // Should most likely be removed when 0.3.13 is released
  model.set('_session.access', ( typeof JSON.parse( document.getElementById('session').innerHTML ).access !== 'undefined' ) );
  
})
