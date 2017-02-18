var host = 'http://37.203.9.7';
var port = 3001;
var root = host + ':' + port;
var ODESSA = "588cf6e7d263bce41074cf0c";
var LVIV = "588cf6e7d263bce41074cf0d";
var defaultCity = ODESSA;
var currentCity = defaultCity;
var authorized;
var phoneRegExp = /^(?:\+?38)?0\d{9}$/;
var emailRegExp = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
var settingsChanged = false;
var order = {
  orderItems: [],
  sum: 0,
  customerInfo: {}
}

var storesItems = {};



$(document).ready(function () {
  // the "href" attribute of .modal-trigger must specify the modal ID that wants to be triggered
  $('.modal').modal();
  $('#city-modal').modal({
    dismissible: true, // Modal can be dismissed by clicking outside of the modal
    opacity: .5, // Opacity of modal background
    inDuration: 300, // Transition in duration
    outDuration: 200, // Transition out duration
    startingTop: '4%', // Starting top style attribute
    endingTop: '30%', // Ending top style attribute
  });
  /* $('.dropdown-button').dropdown({
     stopPropagation: true
   }
   );*/
  // $('.parallax').parallax();

  window.addEventListener('hashchange', function () {
    render(decodeURI(window.location.hash));

  });
  isAuthorized();
  console.log(isAuthorized());

  //renderInitialPage();
  currentCity = getCookie('cityId');

  console.log(currentCity);
  if (currentCity !== '') {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    console.log('test');
  }
  else {
    //currentCity = defaultCity;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    $('#city-modal').modal('open');

  }
  // $('#city-modal').modal('open');
  //


  //

});



function render(url) {
  //get the keyword
  var temp = url.split('/')[0];
  var fab = document.querySelector('.fixed-action-btn');
  if (fab.classList.contains('scale-out')) {
    fab.classList.remove('scale-out');
    fab.classList.add('scale-in');
  }
  var page = document.querySelectorAll('.main-content .page');
  for (var i = 0, pl = page.length; i < pl; i++) {

    page[i].classList.remove('visible');
  }
  var map = {
    //home
    '': function () {
      //console.log("home");
      renderInitialPage();
    },
    //Single Store Page
    '#store': function () {
      var storeId = url.split('#store/')[1].trim();
      //console.log(storeId)
      renderStorePage(storeId);
    },
    //Shopping Cart Page
    '#cart': function () {
      if (fab.classList.contains('scale-in')) {
        fab.classList.remove('scale-in');
      }
      fab.classList.add('scale-out');
      renderCartPage();
    },
    //Delivery Info
    '#delivery': function () {
      renderDeliveryPage();
    },
    //Register Page
    '#register': function () {
      renderRegisterPage();
    },
    //Account Page
    '#account': function () {
      renderAccountPage();
    }
  };
  if (map[temp]) {
    map[temp]();
  }
  else {
    renderErrorPage();
  }

}

function renderAccountPage() {
  if(authorized){
    getOrders(function(orders) {
      console.log(orders);
      renderTemplate('.account.page', '#userOrdersTemplate', JSON.parse(orders), '#userOrdersTarget');
      var name = document.querySelector('#changedName');
      var phone = document.querySelector('#changedPhoneNumber');
      
      if ((name.value == '' && phone.value == '') || settingsChanged){
        getUser(function(user) {
          var street = document.querySelector('#changedStreet');
          var house = document.querySelector('#changedHouse');
          user = JSON.parse(user);
          name.value = user.name;
          phone.value = user.phone;
          if (user.street)
            street.value = user.street;
          if (user.house)
            house.value = user.house;
          Materialize.updateTextFields();
          settingsChanged = false;
        })
      }
      $('ul.tabs').tabs();
    })
  }
  else {
    window.location.hash = '#';
    $('#loginModal').modal('open');
  }
  
}
function renderDeliveryPage() {
  var page = document.querySelector('.delivery.page');
  page.classList.add('visible');
}
function renderRegisterPage() {
  var page = document.querySelector('.register.page');
  page.classList.add('visible');
}
function renderInitialPage() {
  var page = document.querySelector('.all-stores.page')
  if (true) {
    getStoretypes(currentCity, function (storetypes) {
      storetypes = JSON.parse(storetypes);

      var template = document.querySelector("#storetypelist-template").innerHTML;
      var compiledTemplate = Handlebars.compile(template);
      var rendered = compiledTemplate((storetypes));
      document.querySelector('#navHorizontal-allstores').innerHTML = rendered;

      var lis = document.querySelectorAll('#navHorizontal-allstores li');
      for (var i = 0, ll = lis.length; i < ll; i++) {
        lis[i].addEventListener('click', function (foo, bar) {
          return function () {
            renderStoresOfType(foo, bar)
          }

        } (currentCity, storetypes.storetypes[i]._id), false)
      }

      template = document.querySelector("#storelistUL-template").innerHTML;

      var compiledTemplate = Handlebars.compile(template);
      var rendered = compiledTemplate((storetypes));

      document.querySelector('#store-list').innerHTML = rendered;


      $('ul.tabs').tabs();
      $('ul.tabs').tabs('select_tab', storetypes.storetypes[0]._id);


      
      /*$('ul.tabs').tabs({
      swipeable: true
    })*/
      document.getElementById('tab' + storetypes.storetypes[0]._id).dispatchEvent(new Event('click'));
    })
  }
  
  window.location.hash = '#'
  page.classList.add('visible');

}

function renderTemplate(_pageselector, _template, _context, _target) {
  var template = document.querySelector(_template).innerHTML;
  Handlebars.registerHelper("prettifyDate", function(timestamp) {
    return new Date(timestamp).toLocaleString()
  });
  var compiledTemplate = Handlebars.compile(template);
  var rendered = compiledTemplate(_context);
  document.querySelector(_target).innerHTML = rendered;
  if (_pageselector !== null) {
    var page = document.querySelector(_pageselector);
    page.classList.add('visible');
  }
}

function renderCartPage() {
    renderTemplate('.shopping-cart.page', '#shopping-cart-template', order, '#shopping-cart-list');
    if (authorized) {
      var name = document.querySelector('#name');
      var phone = document.querySelector('#phone_number');
      
      if ((name.value == '' && phone.value == '')|| settingsChanged){
        getUser(function(user) {
          var street = document.querySelector('#street');
          var house = document.querySelector('#house');
          user = JSON.parse(user);
          name.value = user.name;
          phone.value = user.phone;
          if (user.street)
            street.value = user.street;
          if (user.house)
            house.value = user.house;
          Materialize.updateTextFields();
          settingsChanged = false;
        })
      }
      
    }
}

function renderStorePage(storeId) {
  var page = document.querySelector('.single-store.page');
  getItems(storeId, function (items) {
    items = JSON.parse(items);
    renderTemplate('.single-store.page', '#single-store-template', items, '#single-store-row');

  })
  getStore(storeId, function (store) {
    store = JSON.parse(store);
    renderTemplate(null, '#storename-template', store.stores[0], '.brand-logo.center.storename');

  })
  var htmlEl = document.getElementsByTagName('html')[0];

  page.style.height = parseInt(page.style.height) + 60 + 'px';

  page.classList.add('visible');
}


function renderStoresOfType(currentCity, type) {
  if (storesItems !== undefined && storesItems[type] !== undefined) {
    var template = document.getElementById("storelist-template").innerHTML;
    var compiledTemplate = Handlebars.compile(template);
    var rendered = compiledTemplate(storesItems[type]);
    document.getElementById(type).innerHTML = rendered;

    var storesDOM = document.getElementById(type).children;
    for (var i = 0; i < storesDOM.length; i++) {
      let id = storesDOM[i].id;
      storesDOM[i].addEventListener('click', function () {
        window.location.hash = "store/" + id;
      }, false)
    }
  }
  else {
    getStores(currentCity, type, function (stores) {
      stores = JSON.parse(stores);
      storesItems[type] = stores;
      var template = document.getElementById("storelist-template").innerHTML;
      var compiledTemplate = Handlebars.compile(template);
      var rendered = compiledTemplate(stores);
      document.getElementById(type).innerHTML = rendered;

      var storesDOM = document.getElementById(type).children;
      for (var i = 0; i < storesDOM.length; i++) {
        let id = storesDOM[i].id;
        storesDOM[i].addEventListener('click', function () {
          window.location.hash = "store/" + id;
        }, false)
      }

    })
  }
}

function renderErrorPage() {

}


function changeQuantityByInput(itemId, storeId, value, price) {


  if (value == '') value = 0;
  //console.log(value);
  var obj = getItemAndStoreFromCart(itemId, storeId);
  var storeNumber = obj.storeNumber;
  var itemNumber = obj.itemNumber;
  if (storeNumber !== null && itemNumber !== null && value >= 0) {

    //var quantityBefore = order.orderItems[storeNumber].items[itemNumber].quantity;
    var sumItemsBefore = order.orderItems[storeNumber].items[itemNumber].sum;
    //var sumBefore = order.sum;
    order.orderItems[storeNumber].items[itemNumber].quantity = value;
    order.orderItems[storeNumber].items[itemNumber].sum = value * price;

    order.sum = order.sum + (value * price - sumItemsBefore);
    if (order.sum < 0) {
      order.sum = 0;
    }
    document.querySelector('.total-sum').innerHTML = order.sum;
    //var input = document.querySelector('.quantity.id' + itemId);
    var sum = document.querySelector('.sum.id' + itemId);
    sum.innerHTML = order.orderItems[storeNumber].items[itemNumber].sum;
    var badge = document.querySelector('.badge');
    badge.innerHTML = '₴' + order.sum;


  }

}


function incrementItemButton(itemId, storeId, price, name) {
  var noToast = true;

  var quantity = document.querySelector('.quantity.id' + itemId);
  if (quantity.value >= 0) {
    incrementItem(itemId, storeId, price, name, noToast);
    var sum = document.querySelector('.sum.id' + itemId);
    sum.innerHTML = Number(sum.innerHTML) + Number(price);
  }
  quantity.value = Number(quantity.value) + 1;

}

function incrementItem(itemId, storeId, price, name, noToast) {
  var result = getItemAndStoreFromCart(itemId, storeId);
  var foundStoreNumber = result.storeNumber;
  var foundItemNumber = result.itemNumber;


  if (foundStoreNumber !== null && foundItemNumber !== null) {
    order.orderItems[foundStoreNumber].items[foundItemNumber].quantity++;
    order.orderItems[foundStoreNumber].items[foundItemNumber].sum = Number(order.orderItems[foundStoreNumber].items[foundItemNumber].sum) + Number(price);

  }
  else if (foundStoreNumber !== null) {
    var object = {};
    object.id = itemId;
    object.name = name;
    object.quantity = 1;
    object.price = price;
    object.sum = price;
    order.orderItems[foundStoreNumber].items.push(object);
  }
  else {
    var itemObject = {};
    itemObject.id = itemId;
    itemObject.name = name;
    itemObject.quantity = 1;
    itemObject.price = price;
    itemObject.sum = price;

    var storeObject = {};
    getStore(storeId, function (store) {
      store = JSON.parse(store);
      storeObject.name = store.stores[0].name;
      storeObject.image = store.stores[0].image;
    })
    storeObject.id = storeId;
    storeObject.items = [];
    storeObject.items.push(itemObject);
    order.orderItems.push(storeObject);

  }
  order.sum += Number(price);
  if (document.querySelector('.total-sum') !== null) {
    document.querySelector('.total-sum').innerHTML = order.sum;
  }

  var badge = document.querySelector('.badge');
  if (badge.style.display == 'none') {
    badge.style.display = 'block';
  }
  badge.innerHTML = '₴' + order.sum;
  if (!noToast)
    /*Materialize.toast(name + ' +', 1000)*/
    Materialize.toast('Товар добавлен :)', 2000)
}

function removeFromCartButton(itemId, storeId, price) {
  var badge = document.querySelector('.badge');
  var result = getItemAndStoreFromCart(itemId, storeId);
  var foundStoreNumber = result.storeNumber;
  var foundItemNumber = result.itemNumber;
  order.sum -= Number(order.orderItems[foundStoreNumber].items[foundItemNumber].price) * Number(order.orderItems[foundStoreNumber].items[foundItemNumber].quantity);
  document.querySelector('.total-sum').innerHTML = order.sum;
  if (order.sum == 0) {
    badge.style.display = 'none';
  }
  badge.innerHTML = '₴' + order.sum;
  if (order.orderItems[foundStoreNumber].items.length > 1) {
    order.orderItems[foundStoreNumber].items.splice(foundItemNumber, 1);
    document.querySelector('.collection-item.id' + itemId + '.avatar.dismissable').outerHTML = '';
  }
  else {
    order.orderItems.splice(foundStoreNumber, 1);
    document.querySelector('.collection.with-header.id' + storeId).outerHTML = '';
  }

}

function decrementItemButton(itemId, storeId, price) {

  var quantityElement = document.querySelector('.quantity.id' + itemId);
  var quantity = Number(quantityElement.value);
  var sum = document.querySelector('.sum.id' + itemId);
  if (quantity > 1) {
    quantityElement.value = quantity - 1;
    sum.innerHTML = Number(sum.innerHTML) - Number(price);
  }
  else {
    document.querySelector('.collection-item.id' + itemId + '.avatar.dismissable').outerHTML = '';
  }
  decrementItem(itemId, storeId, price);
}

function decrementItem(itemId, storeId, price) {
  var result = getItemAndStoreFromCart(itemId, storeId);
  var foundStoreNumber = result.storeNumber;
  var foundItemNumber = result.itemNumber;

  var badge = document.querySelector('.badge');

  if (foundStoreNumber !== null && foundItemNumber !== null) {
    if (order.orderItems[foundStoreNumber].items[foundItemNumber].quantity > 1) {
      order.orderItems[foundStoreNumber].items[foundItemNumber].quantity--;
      order.orderItems[foundStoreNumber].items[foundItemNumber].sum = Number(order.orderItems[foundStoreNumber].items[foundItemNumber].quantity) * Number(order.orderItems[foundStoreNumber].items[foundItemNumber].price);
      order.sum -= Number(price);
      document.querySelector('.total-sum').innerHTML = order.sum;
      if (order.sum == 0) {
        badge.style.display = 'none';
      }
      badge.innerHTML = '₴' + order.sum;
    }
    else if (order.orderItems[foundStoreNumber].items[foundItemNumber].quantity == 1) {

      order.orderItems[foundStoreNumber].items[foundItemNumber].quantity--;
      order.orderItems[foundStoreNumber].items[foundItemNumber].sum = Number(order.orderItems[foundStoreNumber].items[foundItemNumber].quantity) * Number(order.orderItems[foundStoreNumber].items[foundItemNumber].price);
      order.sum -= Number(price);
      document.querySelector('.total-sum').innerHTML = order.sum;
      if (order.sum == 0) {
        badge.style.display = 'none';
      }
      badge.innerHTML = '₴' + order.sum;
      if (order.orderItems[foundStoreNumber].items.length > 1)
        order.orderItems[foundStoreNumber].items.splice(foundItemNumber, 1);
      else {
        order.orderItems.splice(foundStoreNumber, 1);
        document.querySelector('.collection.with-header.id' + storeId).outerHTML = '';
      }
    }

    else {
      if (order.orderItems[foundStoreNumber].items.length > 1)
        order.orderItems[foundStoreNumber].items.splice(foundItemNumber, 1);
      else {
        order.orderItems.splice(foundStoreNumber, 1);
        document.querySelector('.collection.with-header.id' + storeId).outerHTML = '';
      }
    }
  }
}

function getItemAndStoreFromCart(itemId, storeId) {
  var foundStore = false;
  var foundStoreNumber = null;
  var foundItemNumber = null;
  var foundItem = false;
  loop1:
  for (let i = 0; i < order.orderItems.length; i++) {
    if (order.orderItems[i].id == storeId) {
      foundStore = true;
      var foundStoreNumber = i;
      for (let j = 0; j < order.orderItems[i].items.length; j++) {
        if (order.orderItems[i].items[j].id == itemId) {
          foundItem = true;

          foundItemNumber = j;
          break loop1;
        }
      }
    }
  }

  return { storeNumber: foundStoreNumber, itemNumber: foundItemNumber };

}


/*get logged user*/
function getUser (callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', root + '/api/v1/users', true);
  xhr.onload = function () {
    if(xhr.status == 200) {
      var user = xhr.responseText;
      callback(user);
    }
  }
  xhr.send();
}

/*get items by store*/
var getItems = function (store, callback) {
  var xhr = new XMLHttpRequest();
  if (store !== undefined)
    xhr.open('get', root + '/api/v1/items?store=' + store, true);
  else
    xhr.open('get', root + '/api/v1/items', true);

  xhr.onload = function () {
    if (xhr.status === 200) {
      var items = xhr.responseText;
      callback(items);
    }
  }
  xhr.send()
}


/*get stores by city and/or type*/
function getStores(city, type, callback) {
  var xhr = new XMLHttpRequest();
  if (city !== undefined && type == undefined)
    xhr.open('GET', root + '/api/v1/stores/?city=' + city, true);
  else if (city !== undefined && type !== undefined) {
    xhr.open('GET', root + '/api/v1/stores/?city=' + city + '&type=' + type, true);
  }
  else xhr.open('GET', root + '/api/v1/stores/', true);
  xhr.onload = function () {
    if (xhr.status === 200) {
      var stores = xhr.responseText;
      callback(stores);
    }
  }
  xhr.send();
}

/*get store by id*/
function getStore(id, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', root + '/api/v1/stores/?id=' + id, true);
  xhr.onload = function () {
    if (xhr.status === 200) {
      var store = xhr.responseText;
      callback(store);
    }
  }
  xhr.send()
}

function getStoretypes(city, callback) {
  var xhr = new XMLHttpRequest();
  if (city !== undefined)
    xhr.open('GET', root + '/api/v1/storetypes/?city=' + city, true);
  else xhr.open('GET', root + '/api/v1/storetypes/', true);
  var context;
  xhr.onload = function () {
    if (xhr.status == 200) {
      var storetypes = xhr.responseText;
      callback(storetypes)

    }

  }
  xhr.send()
}

function getOrders(callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', root + '/api/v1/orders', true);
  xhr.onload = function () {
    if (xhr.status == 200) {
      var orders = xhr.responseText;
      callback(orders);
    }
  }
  xhr.send();
}

function formToObject(form) {
  var object = {};
  var formData = new FormData(document.querySelector(form));
  formData = Array.from(formData.entries());
  var formDataLength = formData.length;
  for (var i = 0; i < formDataLength; i++) {
    object[formData[i][0]] = formData[i][1];
  }
  return object;
}

function submitRegistrationForm() {
  var customerInfo = formToObject('form.registration');
  if (validateRegistrationForm(customerInfo)) {
    customerInfo.city = currentCity;
    var xhr = new XMLHttpRequest();
    xhr.open('POST', root + '/api/v1/users', true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    xhr.send(JSON.stringify(customerInfo));
    xhr.onloadend = function () {
      window.location.hash = 'account';
      $('#registeredModal').modal('open');
    }
  }
}

function validateRegistrationForm(customerInfo) {
  var valid = true;
  if (!phoneRegExp.test(customerInfo.regPhoneNumber)) {
    valid = false;
  }
  return valid;
}

function validateOrderForm(customerInfo) {
  var valid = true;
  if (order.sum <= 0 || !phoneRegExp.test(customerInfo.phone_number)) {
    valid = false;
  }
  return valid;
}

function submitOrderForm() {
  var customerInfo = formToObject('form.order');
  if (validateOrderForm(customerInfo)) {
    order.customerInfo = customerInfo;
    var xhr = new XMLHttpRequest();
    xhr.open('POST', root + '/api/v1/orders', true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    xhr.send(JSON.stringify(order));
    xhr.onloadend = function () {
      order = {
        orderItems: [],
        sum: 0,
        customerInfo: {}
      }
      var badge = document.querySelector('.badge');
      badge.innerHTML = '₴' + order.sum;
      badge.style.display = 'none';
      window.location.hash = '#';
      $('#orderedModal').modal('open');


    }
  }

}

function validateLoginForm(loginInfo) {
  var valid = true;
  if (loginInfo.password.length < 5 && !emailRegExp.test(loginInfo.email)) {
    valid = false;
  }
  return valid;
}

function submitLoginForm() {
  var loginInfo = formToObject('form.login');
  if (validateLoginForm(loginInfo)) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', root + '/api/v1/session', true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    xhr.send(JSON.stringify(loginInfo));
    xhr.onload = function () {
      if (xhr.readyState == XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          var response = JSON.parse(xhr.responseText);
          console.log(response.success);
          if (response.success == true) {
            console.log(response);
            $('#loginModal').modal('close');
            authorize();
            window.location.hash = 'account';
          }
          else if (response.success == false) {
            console.log(response);
            alert('Неправильный email или пароль');
          }
        }

      }
    }
  }

  console.log(loginInfo)
}

function submitSettingsForm() {
  var newSettings = formToObject('form.settings');
  var xhr = new XMLHttpRequest();
  xhr.open('PUT', root + '/api/v1/users', true);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
  xhr.send(JSON.stringify(newSettings));
  xhr.onload = function () {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      if (xhr.status === 200) {
        var response = JSON.parse(xhr.responseText);
        if (response.success == true) {
          //renderAccountPage();
          //console.log(response);
          settingsChanged = true;
          Materialize.toast('Сохранено', 2000);
        }
        else {
          Materialize.toast('Неправильный номер телефона');
        }
      }
    }
  }
}



function isAuthorized() {
  getSessionStatus(function (sessionStatus) {
    authorized = sessionStatus.authorized;
  })
}

function getSessionStatus(callback) {
  var xhr = new XMLHttpRequest;
  xhr.open('GET', root + '/api/v1/session/status');
  xhr.onload = function() {
    if (xhr.status == 200) {
      var sessionStatus = JSON.parse(xhr.responseText);
      callback(sessionStatus);
      
    }
  }

  xhr.send()
}

function authorize() {
  authorized = true;
  setCookie('authorized', true, 999);
}

function accountButton() {
  if (!authorized) {
    $('#loginModal').modal('open');
  }
  else {
    window.location.hash = 'account';
  }
}
function logOutButton() {
  var xhr = new XMLHttpRequest();
  xhr.open('DELETE', root + '/api/v1/session');
  xhr.onload = function() {
    if (xhr.status == 200) {
      authorized = false;
      setCookie('authorized', false, 999);
      window.location.hash = '#';
    }
  }
  xhr.send();
}

function shoppingCartButton() {
  if (order.sum > 0) {
    window.location.hash = '#cart';
  }
  else Materialize.toast('Корзина пуста', 2000);
}

function goBack() {
  window.history.back();
}

function trigger() {
  $('ul.tabs').tabs('select_tab', 'account-window');

};
function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}
function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
  var expires = "expires=" + d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}