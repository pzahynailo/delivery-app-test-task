let host = 'http://62.16.29.73';
let port = 80;
let root = host + ':' + port;
let ODESSA = "588cf6e7d263bce41074cf0c";
let LVIV = "588cf6e7d263bce41074cf0d";
let currentCity;
let authorized;
let phoneRegExp = /^(?:\+?38)?0\d{9}$/;
let emailRegExp = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
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
      if (authorized == undefined) {
        xhr('GET', '/api/v1/session/status', {}, function (statusCode, sessionStatus) {
          if (statusCode >= 400) {
            console.error(statusCode);
            return;
          }
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
  Handlebars.registerHelper("prettifyDate", function (timestamp) {
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
  if (authorized) {
    xhr('GET', '/api/v1/orders', {}, function (statusCode, orders) {
      if (statusCode >= 400) {
        window.location.hash = '#';
        $('#loginModal').modal('open');
        console.error(statusCode);
        return;
      }
      if (orders.orders.length !== 0) {
        renderTemplate('.account.page', '#userOrdersTemplate', orders, '#userOrders');
        $(document).ready(function () {
          $('.collapsible').collapsible();
        });
      }
      else {
        renderTemplate('.account.page', '#emptyOrdersTemplate', {}, '#userOrders');
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
    xhr('GET', '/api/v1/storetypes', {cityId: currentCity}, function (statusCode, storetypes) {
      if (statusCode >= 400) {
        console.error(statusCode);
        return;
      }
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

function updateUserInfo() {
  xhr('GET', '/api/v1/users', {}, function (statusCode, user) {
    if (statusCode >= 400) {
      console.error(statusCode);
      return;
    }
    let streetSettings = document.querySelector('#changedStreet');
    let houseSettings = document.querySelector('#changedHouse');
    let nameSettings = document.querySelector('#changedName');
    let phoneSettings = document.querySelector('#changedPhoneNumber');

    let nameCart = document.querySelector('#name');
    let phoneCart = document.querySelector('#phone_number');
    let streetCart = document.querySelector('#street');
    let houseCart = document.querySelector('#house');

    nameCart.value = nameSettings.value = user.name;
    phoneCart.value = phoneSettings.value = user.phone;
    streetCart.value = streetSettings.value = !user.street ? '' : user.street;
    houseCart.value = houseSettings = !user.house ? '' : user.house;

    Materialize.updateTextFields();
  })
}

function renderCartPage() {
  renderTemplate('.shopping-cart.page', '#shopping-cart-template', order, '#shopping-cart-list');
}

function renderStorePage(storeId) {
  let page = document.querySelector('.single-store.page');
  xhr('GET', '/api/v1/items', {'storeId': storeId}, function (statusCode, items) {
    if (statusCode >= 400) {
      console.error(statusCode);
      return;
    }
    renderTemplate('.single-store.page', '#single-store-template', items, '#single-store-row');
  })
  xhr('GET', '/api/v1/stores', {_id: storeId}, function (statusCode, store) {
    if (statusCode >= 400) {
      console.error(statusCode);
      return;
    }
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
    
    xhr('GET', '/api/v1/stores', {cityId: currentCity, typeId: type},  function (statusCode, stores) {
      if (statusCode >= 400) {
        console.error(statusCode);
        return;
      }
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
    updateBadge();


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
    xhr('GET', '/api/v1/stores', {_id: storeId}, function (statusCode, store) {
      if (statusCode >= 400) {
        console.error(statusCode);
        return;
      }
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

  updateBadge();
  if (!noToast)
    /*Materialize.toast(name + ' +', 1000)*/
    Materialize.toast('Товар добавлен :)', 2000)
}

function removeFromCartButton(itemId, storeId, price) {
  let result = getItemAndStoreFromCart(itemId, storeId);
  let foundStoreNumber = result.storeNumber;
  let foundItemNumber = result.itemNumber;
  order.sum -= Number(order.orderItems[foundStoreNumber].items[foundItemNumber].price) * Number(order.orderItems[foundStoreNumber].items[foundItemNumber].quantity);
  document.querySelector('.total-sum').innerHTML = order.sum;
  updateBadge();
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


  if (foundStoreNumber !== null && foundItemNumber !== null) {
    if (order.orderItems[foundStoreNumber].items[foundItemNumber].quantity > 1) {
      order.orderItems[foundStoreNumber].items[foundItemNumber].quantity--;
      order.orderItems[foundStoreNumber].items[foundItemNumber].sum = Number(order.orderItems[foundStoreNumber].items[foundItemNumber].quantity) * Number(order.orderItems[foundStoreNumber].items[foundItemNumber].price);
      order.sum -= Number(price);
      document.querySelector('.total-sum').innerHTML = order.sum;
      updateBadge();
    }
    else if (order.orderItems[foundStoreNumber].items[foundItemNumber].quantity == 1) {

      order.orderItems[foundStoreNumber].items[foundItemNumber].quantity--;
      order.orderItems[foundStoreNumber].items[foundItemNumber].sum = Number(order.orderItems[foundStoreNumber].items[foundItemNumber].quantity) * Number(order.orderItems[foundStoreNumber].items[foundItemNumber].price);
      order.sum -= Number(price);
      document.querySelector('.total-sum').innerHTML = order.sum;
      updateBadge();
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
  if (validateRegistrationForm(customerInfo)) {
    customerInfo.cityId = currentCity;
    xhr('POST', '/api/v1/users', customerInfo, function(statusCode, error) {
      if (statusCode >= 400) {
        if (error.reason == 'duplicate' && error.fields[0] == 'email') {
          Materialize.toast('Email занят', 3000);
        }
        console.error(statusCode);
        return;
      }
      authorize();
      window.location.hash = 'account';
      $('registeredModal').modal('open');
    })
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

function isJSON (data) {
  try {
    JSON.parse(data);
  }
  catch(e) {
    return false;
  }
  return true;
}

function xhr(method, path, params, callback) {
  let xhr = new XMLHttpRequest();
  xhr.open(method, root + path + (method == 'GET' ? '?' + encodeQuery(params): ''), true);
  if (method == 'POST' || method == 'PUT') {
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
  }
  xhr.onload = function () {
    callback(xhr.status, isJSON(xhr.responseText) ? JSON.parse(xhr.responseText) : {});
  }
  xhr.send(method == 'POST' || method == 'PUT' ? JSON.stringify(params) : null);
}

function clearCart() {
  order = {
    orderItems: [],
    sum: 0,
    customerInfo: {}
  }
}
function updateBadge() {
  let badge = document.querySelector('.badge');
  badge.innerHTML = '₴' + order.sum;
  badge.style.display = order.sum ? 'block' : 'none';
}

function submitOrderForm() {
  let customerInfo = formToObject('form.order');
  if (validateOrderForm(customerInfo)) {
    order.customerInfo = customerInfo;
    xhr('POST', '/api/v1/orders', order, function(statusCode) {
      if (statusCode >= 400) {
        console.error(statusCode);
        return;
      }
      clearCart();
      updateBadge();
      window.location.hash = '#';
      $('#orderedModal').modal('open');
    })
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
    xhr('POST', '/api/v1/session', loginInfo, function(statusCode) {
      if (statusCode >= 400) {
        alert('Неправильный email или пароль');
        return;
      }
      authorize();     
    })
  }
}

function submitSettingsForm() {
  let settings = formToObject('form.settings');
  settings = {
    name: settings.changedName,
    phone: settings.changedPhoneNumber,
    street: settings.changedStreet,
    house: settings.changedHouse
  }
  xhr('PUT', '/api/v1/users', settings, function(statusCode) {
    if (statusCode >= 400) {
      Materialize.toast('Неправильный номер телефона');
      return;
    }
    updateUserInfo();
    Materialize.toast('Сохранено', 2000);
  })
}


function isAuthorized() {
  xhr('GET', '/api/v1/session/status', {}, function (statusCode, sessionStatus) {
    if (statusCode >= 400) {
      console.error(statusCode);
      return;
    }
    authorized = sessionStatus.authorized;
    if (authorized) {
      updateUserInfo();
    }
  })
}



function authorize() {
  $('#loginModal').modal('close');
  authorized = true;

  updateUserInfo();
  setCookie('authorized', true, 999);
  window.location.hash = 'account';
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
  xhr('DELETE', '/api/v1/session', {}, function(statusCode) {
    if (statusCode >= 400) {
      console.error(statusCode);
      return;
    }
    authorized = false;
    setCookie('authorized', false, 999);
    window.location.hash = '#';
  })
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