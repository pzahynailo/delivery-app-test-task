let host = 'http://62.16.29.73';
let port = 80;
let root = host + ':' + port;
let ODESSA = "588cf6e7d263bce41074cf0c";
let LVIV = "588cf6e7d263bce41074cf0d";
let currentCity;
let authorized;
let phoneRegExp = /^(?:\+?38)?0\d{9}$/;
let emailRegExp = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
let settingsChanged = false;
let order = {
  orderItems: [],
  sum: 0,
  customerInfo: {}
}

let storesItems = {};



$(document).ready(function () {
  isAuthorized();
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
  currentCity = getCookie('cityId');
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  if (currentCity == '') {
    $('#city-modal').modal('open');
  }
});



function render(url) {
  //get the keyword
  let path = url.split('/')[0];
  let fab = document.querySelector('.fixed-action-btn');
  if (fab.classList.contains('scale-out')) {
    fab.classList.remove('scale-out');
    fab.classList.add('scale-in');
  }
  let page = document.querySelectorAll('.main-content .page');

  for (let i = 0, pl = page.length; i < pl; i++) {
    page[i].classList.remove('visible');
  }
  let map = {
    //home
    '': function () {
      renderInitialPage();
    },
    //Single Store Page
    '#store': function () {
      let storeId = url.split('#store/')[1].trim();
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
      if (authorized  == undefined) {
        getSessionStatus(function (sessionStatus) {
          authorized = sessionStatus.authorized;
          renderAccountPage();
        })
      }
      else renderAccountPage();
    }
  };
  if (map[path]) {
    map[path]();
  }
  else {
    renderErrorPage();
  }
}

function renderTemplate(_pageselector, _template, _context, _target) {
  let template = document.querySelector(_template).innerHTML;
  Handlebars.registerHelper("prettifyDate", function(timestamp) {
    return new Date(timestamp).toLocaleString()
  });
  let compiledTemplate = Handlebars.compile(template);
  let rendered = compiledTemplate(_context);
  document.querySelector(_target).innerHTML = rendered;
  if (_pageselector !== null) {
    let page = document.querySelector(_pageselector);
    page.classList.add('visible');
  }
}

function renderAccountPage() {
  if(authorized){
    getOrders(function(orders) {      
      if (orders.orders.length !== 0){
        renderTemplate('.account.page', '#userOrdersTemplate', orders, '#userOrders');
        $(document).ready(function(){
          $('.collapsible').collapsible();
        });
      }
      else {
        document.querySelector('.account.page').classList.add('visible');
      }
      let street = document.querySelector('#changedStreet');
      let house = document.querySelector('#changedHouse');
      let name = document.querySelector('#changedName');
      let phone = document.querySelector('#changedPhoneNumber');
      if (name.value == '' && phone.value == ''){
          getUser(function(user) {
            name.value = user.name;
            phone.value = user.phone;
            if (user.street) {
              street.value = user.street;
            }
            if (user.house) {
              house.value = user.house;
            }
            Materialize.updateTextFields();
          })
        }
      $('.account.page ul.tabs').tabs();
    })
  }
  else {
    window.location.hash = '#';
    $('#loginModal').modal('open');
  }
  
}

function renderDeliveryPage() {
  document.querySelector('.delivery.page').classList.add('visible');
}
function renderRegisterPage() {
  document.querySelector('.register.page').classList.add('visible');
}
function renderInitialPage() {
  if (Object.keys(storesItems).length === 0 && storesItems.constructor === Object) {
    getStoretypes(currentCity, function (storetypes) {
      renderTemplate(null, '#storetypelist-template', storetypes, '#navHorizontal-allstores');
      
      let lis = document.querySelectorAll('#navHorizontal-allstores li');
      for (let i = 0, ll = lis.length; i < ll; i++) {
        lis[i].addEventListener('click', function () {
          renderStoresOfType(currentCity, storetypes.storetypes[i]._id);        
        }, false)
      }
      renderTemplate(null, '#storelistUL-template', storetypes, '#store-list');

      $('ul.tabs').tabs();
      $('ul.tabs').tabs('select_tab', storetypes.storetypes[0]._id);
      
        /*$('ul.tabs').tabs({
        swipeable: true
      })*/
      document.getElementById('tab' + storetypes.storetypes[0]._id).dispatchEvent(new Event('click'));
    })
  }
  if (Object.keys(storesItems).length === 0) {
    $('ul.tabs').tabs();
  }
  window.location.hash = '#'
  document.querySelector('.all-stores.page').classList.add('visible');
}



function renderCartPage() {
    renderTemplate('.shopping-cart.page', '#shopping-cart-template', order, '#shopping-cart-list');
    if (authorized) {
      let name = document.querySelector('#name');
      let phone = document.querySelector('#phone_number');
      
      if ((name.value == '' && phone.value == '')|| settingsChanged){
        getUser(function(user) {
          let street = document.querySelector('#street');
          let house = document.querySelector('#house');
          
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
  let page = document.querySelector('.single-store.page');
  getItems(storeId, function (items) {
    renderTemplate('.single-store.page', '#single-store-template', items, '#single-store-row');

  })
  getStore(storeId, function (store) {
    renderTemplate(null, '#storename-template', store.stores[0], '.brand-logo.center.storename');

  })
  let htmlEl = document.getElementsByTagName('html')[0];

  page.style.height = parseInt(page.style.height) + 60 + 'px';

  page.classList.add('visible');
}


function renderStoresOfType(currentCity, type) {
  if (storesItems !== undefined && storesItems[type] !== undefined) {
    let template = document.getElementById("storelist-template").innerHTML;
    let compiledTemplate = Handlebars.compile(template);
    let rendered = compiledTemplate(storesItems[type]);
    document.getElementById(type).innerHTML = rendered;

    let storesDOM = document.getElementById(type).children;
    for (let i = 0; i < storesDOM.length; i++) {
      let id = storesDOM[i].id;
      storesDOM[i].addEventListener('click', function () {
        window.location.hash = "store/" + id;
      }, false)
    }
  }
  else {
    getStores(currentCity, type, function (stores) {
      storesItems[type] = stores;
      let template = document.getElementById("storelist-template").innerHTML;
      let compiledTemplate = Handlebars.compile(template);
      let rendered = compiledTemplate(stores);
      document.getElementById(type).innerHTML = rendered;

      let storesDOM = document.getElementById(type).children;
      for (let i = 0; i < storesDOM.length; i++) {
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
  let obj = getItemAndStoreFromCart(itemId, storeId);
  let storeNumber = obj.storeNumber;
  let itemNumber = obj.itemNumber;
  if (storeNumber !== null && itemNumber !== null && value >= 0) {

    //let quantityBefore = order.orderItems[storeNumber].items[itemNumber].quantity;
    let sumItemsBefore = order.orderItems[storeNumber].items[itemNumber].sum;
    //let sumBefore = order.sum;
    order.orderItems[storeNumber].items[itemNumber].quantity = value;
    order.orderItems[storeNumber].items[itemNumber].sum = value * price;

    order.sum = order.sum + (value * price - sumItemsBefore);
    if (order.sum < 0) {
      order.sum = 0;
    }
    document.querySelector('.total-sum').innerHTML = order.sum;
    //let input = document.querySelector('.quantity.id' + itemId);
    let sum = document.querySelector('.sum.id' + itemId);
    sum.innerHTML = order.orderItems[storeNumber].items[itemNumber].sum;
    let badge = document.querySelector('.badge');
    badge.innerHTML = '₴' + order.sum;


  }

}


function incrementItemButton(itemId, storeId, price, name) {
  let noToast = true;

  let quantity = document.querySelector('.quantity.id' + itemId);
  if (quantity.value >= 0) {
    incrementItem(itemId, storeId, price, name, noToast);
    let sum = document.querySelector('.sum.id' + itemId);
    sum.innerHTML = Number(sum.innerHTML) + Number(price);
  }
  quantity.value = Number(quantity.value) + 1;

}

function incrementItem(itemId, storeId, price, name, noToast) {
  let result = getItemAndStoreFromCart(itemId, storeId);
  let foundStoreNumber = result.storeNumber;
  let foundItemNumber = result.itemNumber;


  if (foundStoreNumber !== null && foundItemNumber !== null) {
    order.orderItems[foundStoreNumber].items[foundItemNumber].quantity++;
    order.orderItems[foundStoreNumber].items[foundItemNumber].sum = Number(order.orderItems[foundStoreNumber].items[foundItemNumber].sum) + Number(price);

  }
  else if (foundStoreNumber !== null) {
    let object = {};
    object.id = itemId;
    object.name = name;
    object.quantity = 1;
    object.price = price;
    object.sum = price;
    order.orderItems[foundStoreNumber].items.push(object);
  }
  else {
    let itemObject = {};
    itemObject.id = itemId;
    itemObject.name = name;
    itemObject.quantity = 1;
    itemObject.price = price;
    itemObject.sum = price;

    let storeObject = {};
    getStore(storeId, function (store) {
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

  let badge = document.querySelector('.badge');
  if (badge.style.display == 'none') {
    badge.style.display = 'block';
  }
  badge.innerHTML = '₴' + order.sum;
  if (!noToast)
    /*Materialize.toast(name + ' +', 1000)*/
    Materialize.toast('Товар добавлен :)', 2000)
}

function removeFromCartButton(itemId, storeId, price) {
  let badge = document.querySelector('.badge');
  let result = getItemAndStoreFromCart(itemId, storeId);
  let foundStoreNumber = result.storeNumber;
  let foundItemNumber = result.itemNumber;
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

  let quantityElement = document.querySelector('.quantity.id' + itemId);
  let quantity = Number(quantityElement.value);
  let sum = document.querySelector('.sum.id' + itemId);
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
  let result = getItemAndStoreFromCart(itemId, storeId);
  let foundStoreNumber = result.storeNumber;
  let foundItemNumber = result.itemNumber;

  let badge = document.querySelector('.badge');

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
  let foundStore = false;
  let foundStoreNumber = null;
  let foundItemNumber = null;
  let foundItem = false;
  loop1:
  for (let i = 0; i < order.orderItems.length; i++) {
    if (order.orderItems[i].id == storeId) {
      foundStore = true;
      let foundStoreNumber = i;
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


function encodeQuery(params) {
   let ret = [];
   for (let p in params)
     ret.push(encodeURIComponent(p) + '=' + encodeURIComponent(params[p]));
   return ret.join('&');
}

/*TODO*/
function xhrGet(path, params, callback) {
  let path = path + '?' + encodeQuery(params);
  let xhr = new XMLHttpRequest();
  xhr.open('GET', root + path, true);
  xhr.onload = function () {
    if (xhr.status == 200) {
      callback(null, JSON.parse(xhr.responseText));
    }
    else {
      callback(xhr.status);
    }
  }
  xhr.send(); 
}


/*get logged user*/
function getUser (callback) {
  let xhr = new XMLHttpRequest();
  xhr.open('GET', root + '/api/v1/users', true);
  xhr.onload = function () {
    if(xhr.status == 200) {
      callback(JSON.parse(xhr.responseText));
    }
  }
  xhr.send();
}

/*get items by store*/
let getItems = function (store, callback) {
  let xhr = new XMLHttpRequest();
  if (store !== undefined)
    xhr.open('get', root + '/api/v1/items?storeId=' + store, true);
  else
    xhr.open('get', root + '/api/v1/items', true);
  xhr.onload = function () {
    if (xhr.status === 200) {
      callback(JSON.parse(xhr.responseText));
    }
  }
  xhr.send()
}


/*get stores by city and/or type*/
function getStores(city, type, callback) {
  let xhr = new XMLHttpRequest();
  if (city !== undefined && type == undefined)
    xhr.open('GET', root + '/api/v1/stores/?cityId=' + city, true);
  else if (city !== undefined && type !== undefined) {
    xhr.open('GET', root + '/api/v1/stores/?cityId=' + city + '&typeId=' + type, true);
  }
  else xhr.open('GET', root + '/api/v1/stores/', true);
  xhr.onload = function () {
    if (xhr.status === 200) {
      callback(JSON.parse(xhr.responseText));
    }
  }
  xhr.send();
}

/*get store by id*/
function getStore(id, callback) {
  let xhr = new XMLHttpRequest();
  xhr.open('GET', root + '/api/v1/stores/?_id=' + id, true);
  xhr.onload = function () {
    if (xhr.status === 200) {
      callback(JSON.parse(xhr.responseText));
    }
  }
  xhr.send()
}

function getStoretypes(city, callback) {
  let xhr = new XMLHttpRequest();
  if (city !== undefined)
    xhr.open('GET', root + '/api/v1/storetypes/?cityId=' + city, true);
  else xhr.open('GET', root + '/api/v1/storetypes/', true);
  let context;
  xhr.onload = function () {
    if (xhr.status == 200) {
      callback(JSON.parse(xhr.responseText))
    }
  }
  xhr.send()
}

function getOrders(callback) {
  let xhr = new XMLHttpRequest();
  xhr.open('GET', root + '/api/v1/orders', true);
  xhr.onload = function () {
    if (xhr.status == 200) {
      callback(JSON.parse(xhr.responseText));
    }
  }
  xhr.send();
}
function getSessionStatus(callback) {
  let xhr = new XMLHttpRequest;
  xhr.open('GET', root + '/api/v1/session/status');
  xhr.onload = function() {
    if (xhr.status == 200) {
      callback(JSON.parse(xhr.responseText));
    }
  }
  xhr.send()
}

function formToObject(form) {
  let object = {};
  let formData = new FormData(document.querySelector(form));
  formData = Array.from(formData.entries());
  let formDataLength = formData.length;
  for (let i = 0; i < formDataLength; i++) {
    object[formData[i][0]] = formData[i][1];
  }
  return object;
}

function submitRegistrationForm() {
  let customerInfo = formToObject('form.registration');
  customerInfo = {
    name: customerInfo.regName,
    password: customerInfo.regPassword,
    email: customerInfo.regEmail,
    street: customerInfo.regStreet,
    house: customerInfo.regHouse,
    phoneNumber: customerInfo.regPhoneNumber
  }
  console.log(customerInfo);
  if (validateRegistrationForm(customerInfo)) {
    console.log('aaa')
    customerInfo.cityId = currentCity;
    let xhr = new XMLHttpRequest();
    xhr.open('POST', root + '/api/v1/users', true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    xhr.send(JSON.stringify(customerInfo));
    xhr.onloadend = function () {
      if(xhr.status == 200) {
        authorize();
        window.location.hash = 'account';
        $('#registeredModal').modal('open');
      }
      if(xhr.status == 400) {
        console.log(xhr.status)
        let error = JSON.parse(xhr.responseText);
        if (error.reason == 'duplicate' && error.fields[0] == 'email') {
          Materialize.toast('Email занят', 3000);
        }
      }
    }
  }
}

function validateRegistrationForm(customerInfo) {
  let valid = true;
  if (!phoneRegExp.test(customerInfo.phoneNumber)) {
    valid = false;
  }
  return valid;
}

function validateOrderForm(customerInfo) {
  let valid = true;
  if (order.sum <= 0 || !phoneRegExp.test(customerInfo.phone_number)) {
    valid = false;
  }
  return valid;
}

function submitOrderForm() {
  let customerInfo = formToObject('form.order');
  if (validateOrderForm(customerInfo)) {
    order.customerInfo = customerInfo;
    let xhr = new XMLHttpRequest();
    xhr.open('POST', root + '/api/v1/orders', true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    xhr.send(JSON.stringify(order));
    xhr.onloadend = function () {
      order = {
        orderItems: [],
        sum: 0,
        customerInfo: {}
      }
      let badge = document.querySelector('.badge');
      badge.innerHTML = '₴' + order.sum;
      badge.style.display = 'none';
      window.location.hash = '#';
      $('#orderedModal').modal('open');


    }
  }

}

function validateLoginForm(loginInfo) {
  let valid = true;
  if (loginInfo.password.length < 5 && !emailRegExp.test(loginInfo.email)) {
    valid = false;
  }
  return valid;
}

function submitLoginForm() {
  let loginInfo = formToObject('form.login');
  if (validateLoginForm(loginInfo)) {
    let xhr = new XMLHttpRequest();
    xhr.open('POST', root + '/api/v1/session', true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    xhr.send(JSON.stringify(loginInfo));
    xhr.onload = function () {
      if (xhr.readyState == XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          $('#loginModal').modal('close');
          authorize();
          window.location.hash = 'account';
        }
        else if (xhr.status === 400) {
          alert('Неправильный email или пароль');
        }

      }
    }
  }

  console.log(loginInfo)
}

function submitSettingsForm() {
  let settings = formToObject('form.settings');
  settings = {
    name: settings.changedName,
    phone: settings.changedPhoneNumber,
    street: settings.changedStreet,
    house: settings.changedHouse
  }
  let xhr = new XMLHttpRequest();
  xhr.open('PUT', root + '/api/v1/users', true);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
  xhr.send(JSON.stringify(settings));
  xhr.onload = function () {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      if (xhr.status === 200) {
        settingsChanged = true;
        Materialize.toast('Сохранено', 2000);
        }
      else if (xhr.status === 400) {
        Materialize.toast('Неправильный номер телефона');
      }
    }
  }
}





function isAuthorized() {
  
  getSessionStatus(function (sessionStatus) {
    authorized = sessionStatus.authorized;
  })
}



function authorize() {
  authorized = true;
  settingsChanged = true;
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
  let xhr = new XMLHttpRequest();
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
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
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
  let d = new Date();
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
  let expires = "expires=" + d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}