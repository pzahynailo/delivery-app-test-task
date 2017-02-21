'use strict';

var host = 'http://62.16.29.73';
var port = 80;
var root = host + ':' + port;
var ODESSA = "588cf6e7d263bce41074cf0c";
var LVIV = "588cf6e7d263bce41074cf0d";
var currentCity = void 0;
var authorized = void 0;
var phoneRegExp = /^(?:\+?38)?0\d{9}$/;
var emailRegExp = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
var order = {
  orderItems: [],
  sum: 0,
  customerInfo: {}
};

var storesItems = {};

$(document).ready(function () {
  isAuthorized();
  $('.modal').modal();
  $('#city-modal').modal({
    dismissible: true, // Modal can be dismissed by clicking outside of the modal
    opacity: .5, // Opacity of modal background
    inDuration: 300, // Transition in duration
    outDuration: 200, // Transition out duration
    startingTop: '4%', // Starting top style attribute
    endingTop: '30%' });
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
  Handlebars.registerHelper("deliveryButtonText", function (status) {
    if (status == 'preparing') {
      return 'Взять заказ';
    }
    if (status == 'delivering') {
      return 'Доставка окончена';
    }
  });
  Handlebars.registerHelper("processing", function (id, status) {
    if (status == 'processing') {
      return '<a class="btn col xs12 s5 operatorConfirmButton" onclick="operatorConfirmButton(\'' + id + '\');">Подтвердить</a>';
    }
  });
});

function render(url) {
  //get the keyword
  var path = url.split('/')[0];
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
    '': function _() {
      renderInitialPage();
    },
    //Single Store Page
    '#store': function store() {
      var storeId = url.split('#store/')[1].trim();
      renderStorePage(storeId);
    },
    //Shopping Cart Page
    '#cart': function cart() {
      if (fab.classList.contains('scale-in')) {
        fab.classList.remove('scale-in');
      }
      fab.classList.add('scale-out');
      renderCartPage();
    },
    //Delivery Info
    '#delivery': function delivery() {
      renderDeliveryPage();
    },
    //Register Page
    '#register': function register() {
      renderRegisterPage();
    },
    //Account Page
    '#account': function account() {
      if (authorized == undefined) {
        xhr('GET', '/api/v1/session/status', {}, function (statusCode, sessionStatus) {
          if (statusCode >= 400) {
            console.error(statusCode);
            return;
          }
          authorized = sessionStatus.authorized;
          renderAccountPage();
        });
      } else renderAccountPage();
    }
  };
  if (map[path]) {
    map[path]();
  } else {
    renderErrorPage();
  }
}

function renderTemplate(_pageselector, _template, _context, _target) {
  var template = document.getElementById(_template).innerHTML;
  Handlebars.registerHelper("prettifyDate", function (timestamp) {
    return new Date(timestamp).toLocaleString();
  });
  var compiledTemplate = Handlebars.compile(template);
  var rendered = compiledTemplate(_context);
  document.getElementById(_target).innerHTML = rendered;
  if (_pageselector !== null) {
    var page = document.querySelector(_pageselector);
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
        renderTemplate('.account.page', 'userOrdersTemplate', orders, 'userOrders');
        $('.collapsible').collapsible();
      } else {
        renderTemplate('.account.page', 'emptyOrdersTemplate', {}, 'userOrders');
      }
      $('.account.page ul.tabs').tabs();
    });
    xhr('GET', '/api/v1/delivery/orders', {}, function (statusCode, orders) {
      if (statusCode < 400) {
        if (orders.orders.length !== 0) {
          renderTemplate(null, 'deliveryOrdersTemplate', orders, 'deliveryOrders');
          $('.collapsible').collapsible();
        } else {
          renderTemplate(null, 'emptyDeliveryOrdersTemplate', {}, 'deliveryOrders');
        }
        document.getElementById("deliveryTab").style.display = 'block';
      } else {
        document.getElementById("deliveryTab").style.display = 'none';
      }
    });
    xhr('GET', '/api/v1/operator/orders', {}, function (statusCode, orders) {
      if (statusCode < 400) {
        console.log(orders);
        if (orders.orders.length !== 0) {
          renderTemplate(null, 'operatorOrdersTemplate', orders, 'operatorOrders');
          $('.collapsible').collapsible();
        } else {
          renderTemplate(null, 'emptyOperatorOrdersTemplate', {}, 'operatorOrders');
        }
        document.getElementById("operatorTab").style.display = 'block';
      } else {
        document.getElementById("operatorTab").style.display = 'none';
      }
    });
  } else {
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
    xhr('GET', '/api/v1/storetypes', { cityId: currentCity }, function (statusCode, storetypes) {
      if (statusCode >= 400) {
        console.error(statusCode);
        return;
      }
      renderTemplate(null, 'storetypelist-template', storetypes, 'navHorizontal-allstores');
      var lis = document.querySelectorAll('#navHorizontal-allstores li');

      var _loop = function _loop(i, ll) {
        lis[i].addEventListener('click', function () {
          renderStoresOfType(currentCity, storetypes.storetypes[i]._id);
        }, false);
      };

      for (var i = 0, ll = lis.length; i < ll; i++) {
        _loop(i, ll);
      }
      renderTemplate(null, 'storelistUL-template', storetypes, 'store-list');

      $('ul.tabs').tabs();
      $('ul.tabs').tabs('select_tab', storetypes.storetypes[0]._id);

      document.getElementById('tab' + storetypes.storetypes[0]._id).dispatchEvent(new Event('click'));
    });
  }
  if (Object.keys(storesItems).length === 0) {
    $('ul.tabs').tabs();
  }
  window.location.hash = '#';
  document.querySelector('.all-stores.page').classList.add('visible');
}

function renderCartPage() {
  renderTemplate('.shopping-cart.page', 'shopping-cart-template', order, 'shopping-cart-list');
}

function renderStorePage(storeId) {
  var page = document.querySelector('.single-store.page');
  xhr('GET', '/api/v1/items', { 'storeId': storeId }, function (statusCode, items) {
    if (statusCode >= 400) {
      console.error(statusCode);
      return;
    }
    renderTemplate('.single-store.page', 'single-store-template', items, 'single-store-row');
  });
  xhr('GET', '/api/v1/stores', { _id: storeId }, function (statusCode, store) {
    if (statusCode >= 400) {
      console.error(statusCode);
      return;
    }
    renderTemplate(null, 'storename-template', store.stores[0], 'storename');
  });

  page.style.height = parseInt(page.style.height) + 60 + 'px';
  page.classList.add('visible');
}

function renderStores(stores, type) {
  renderTemplate(null, 'storelist-template', stores, type);
  var storesDOM = document.getElementById(type).children;

  var _loop2 = function _loop2(i) {
    var id = storesDOM[i].id;
    storesDOM[i].addEventListener('click', function () {
      window.location.hash = "store/" + id;
    }, false);
  };

  for (var i = 0; i < storesDOM.length; i++) {
    _loop2(i);
  }
}

function renderStoresOfType(currentCity, type) {
  if (storesItems !== undefined && storesItems[type] !== undefined) {
    renderStores(storesItems[type], type);
  } else {
    xhr('GET', '/api/v1/stores', { cityId: currentCity, typeId: type }, function (statusCode, stores) {
      if (statusCode >= 400) {
        console.error(statusCode);
        return;
      }
      renderStores(stores, type);
    });
  }
}

function renderErrorPage() {}

function updateUserInfo() {
  xhr('GET', '/api/v1/users', {}, function (statusCode, user) {
    if (statusCode >= 400) {
      console.error(statusCode);
      return;
    }
    var streetSettings = document.querySelector('#changedStreet');
    var houseSettings = document.querySelector('#changedHouse');
    var nameSettings = document.querySelector('#changedName');
    var phoneSettings = document.querySelector('#changedPhoneNumber');

    var nameCart = document.querySelector('#name');
    var phoneCart = document.querySelector('#phone_number');
    var streetCart = document.querySelector('#street');
    var houseCart = document.querySelector('#house');

    nameCart.value = nameSettings.value = user.name;
    phoneCart.value = phoneSettings.value = user.phone;
    streetCart.value = streetSettings.value = !user.street ? '' : user.street;
    houseCart.value = houseSettings = !user.house ? '' : user.house;

    Materialize.updateTextFields();
  });
}

function changeQuantityByInput(itemId, storeId, value, price) {
  var unvalidated = value.split('');
  value = '';
  var input = document.querySelector('.quantity.id' + itemId);
  for (var i = 0, vl = unvalidated.length; i < vl; i++) {
    if (unvalidated[i] >= 0 && unvalidated[i] <= 9 && unvalidated[i] !== ' ') {
      value += unvalidated[i];
    }
  }
  input.value = value;

  if (value == '') {
    value = 0;
  }

  var obj = getItemAndStoreFromCart(itemId, storeId);
  var storeNumber = obj.storeIndex;
  var itemNumber = obj.itemIndex;
  if (storeNumber !== null && itemNumber !== null && value >= 0) {

    var sumItemsBefore = order.orderItems[storeNumber].items[itemNumber].sum;
    order.orderItems[storeNumber].items[itemNumber].quantity = value;
    order.orderItems[storeNumber].items[itemNumber].sum = value * price;

    order.sum = order.sum + (value * price - sumItemsBefore);
    if (order.sum < 0) {
      order.sum = 0;
    }
    document.querySelector('.total-sum').innerHTML = order.sum;
    //let input = document.querySelector('.quantity.id' + itemId);
    var sum = document.querySelector('.sum.id' + itemId);
    sum.innerHTML = order.orderItems[storeNumber].items[itemNumber].sum;
    updateBadge();
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
  var storeIndex = result.storeIndex;
  var itemIndex = result.itemIndex;

  if (storeIndex === null) {
    var store = {};
    store.id = storeId;
    store.items = [];
    storeIndex = order.orderItems.push(store) - 1;

    xhr('GET', '/api/v1/stores', { _id: storeId }, function (statusCode, storeResponse) {
      if (statusCode >= 400) {
        console.error(statusCode);
        return;
      }
      order.orderItems[storeIndex].name = storeResponse.stores[0].name;
      order.orderItems[storeIndex].image = storeResponse.stores[0].image;
      order.orderItems[storeIndex].address = storeResponse.stores[0].address;
    });
  }
  if (itemIndex === null) {
    var item = {};
    item.id = itemId;
    item.name = name;
    item.quantity = item.sum = 0;
    item.price = price;
    itemIndex = order.orderItems[storeIndex].items.push(item) - 1;
  }

  order.orderItems[storeIndex].items[itemIndex].quantity++;
  order.orderItems[storeIndex].items[itemIndex].sum += Number(price);
  order.sum += Number(price);

  if (document.querySelector('.total-sum') !== null) {
    document.querySelector('.total-sum').innerHTML = order.sum;
  }

  updateBadge();
  if (!noToast) {
    /*Materialize.toast(name + ' +', 1000)*/
    Materialize.toast('Товар добавлен :)', 2000);
  }
}

function removeFromCartButton(itemId, storeId, price) {
  var result = getItemAndStoreFromCart(itemId, storeId);
  var storeIndex = result.storeIndex;
  var itemIndex = result.itemIndex;
  order.sum -= order.orderItems[storeIndex].items[itemIndex].price * order.orderItems[storeIndex].items[itemIndex].quantity;
  document.querySelector('.total-sum').innerHTML = order.sum;
  updateBadge();
  order.orderItems[storeIndex].items.splice(itemIndex, 1);
  document.querySelector('.collection-item.id' + itemId + '.avatar.dismissable').outerHTML = '';

  if (order.orderItems[storeIndex].items.length == 0) {
    order.orderItems.splice(storeIndex, 1);
    document.querySelector('.collection.with-header.id' + storeId).outerHTML = '';
  }
}

function decrementItemButton(itemId, storeId, price) {
  var quantityElement = document.querySelector('.quantity.id' + itemId);
  var quantity = Number(quantityElement.value);
  var sum = document.querySelector('.sum.id' + itemId);
  quantityElement.value = quantity - 1;
  sum.innerHTML = Number(sum.innerHTML) - Number(price);
  decrementItem(itemId, storeId, price);
}

function decrementItem(itemId, storeId, price) {
  var result = getItemAndStoreFromCart(itemId, storeId);
  var storeIndex = result.storeIndex;
  var itemIndex = result.itemIndex;

  order.orderItems[storeIndex].items[itemIndex].quantity--;
  order.orderItems[storeIndex].items[itemIndex].sum -= Number(price);
  order.sum -= Number(price);

  if (!order.orderItems[storeIndex].items[itemIndex].quantity) {
    order.orderItems[storeIndex].items.splice(itemIndex, 1);
    document.querySelector('.collection-item.id' + itemId + '.avatar.dismissable').outerHTML = '';
    if (order.orderItems[storeIndex].items.length === 0) {
      order.orderItems.splice(storeIndex, 1);
      document.querySelector('.collection.with-header.id' + storeId).outerHTML = '';
    }
  }

  updateBadge();
  document.querySelector('.total-sum').innerHTML = order.sum;
}

function getItemAndStoreFromCart(itemId, storeId) {
  var storeIndex = null;
  var itemIndex = null;

  for (var i = 0, len = order.orderItems.length; i < len; i++) {
    if (order.orderItems[i].id == storeId) {
      storeIndex = i;
      for (var j = 0, len2 = order.orderItems[i].items.length; j < len2; j++) {
        if (order.orderItems[i].items[j].id == itemId) {
          itemIndex = j;
          break;
        }
      }
      break;
    }
  }
  return { storeIndex: storeIndex, itemIndex: itemIndex };
}

function encodeQuery(params) {
  var ret = [];
  for (var p in params) {
    ret.push(encodeURIComponent(p) + '=' + encodeURIComponent(params[p]));
  }return ret.join('&');
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
  customerInfo = {
    name: customerInfo.regName,
    password: customerInfo.regPassword,
    email: customerInfo.regEmail,
    street: customerInfo.regStreet,
    house: customerInfo.regHouse,
    phoneNumber: customerInfo.regPhoneNumber
  };
  if (validateRegistrationForm(customerInfo)) {
    customerInfo.cityId = currentCity;
    xhr('POST', '/api/v1/users', customerInfo, function (statusCode, error) {
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
    });
  }
}

function validateRegistrationForm(customerInfo) {
  var valid = true;
  if (!phoneRegExp.test(customerInfo.phoneNumber)) {
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

function isJSON(data) {
  try {
    JSON.parse(data);
  } catch (e) {
    return false;
  }
  return true;
}

function xhr(method, path, params, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open(method, root + path + (method == 'GET' ? '?' + encodeQuery(params) : ''), true);
  if (method == 'POST' || method == 'PUT') {
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
  }
  xhr.onload = function () {
    callback(xhr.status, isJSON(xhr.responseText) ? JSON.parse(xhr.responseText) : {});
  };
  xhr.send(method == 'POST' || method == 'PUT' ? JSON.stringify(params) : null);
}

function clearCart() {
  order = {
    orderItems: [],
    sum: 0,
    customerInfo: {}
  };
}
function updateBadge() {
  var badge = document.querySelector('.badge');
  badge.innerHTML = '₴' + order.sum;
  badge.style.display = order.sum ? 'block' : 'none';
}

function submitOrderForm() {
  var customerInfo = formToObject('form.order');
  if (validateOrderForm(customerInfo)) {
    order.customerInfo = customerInfo;
    xhr('POST', '/api/v1/orders', order, function (statusCode) {
      if (statusCode >= 400) {
        console.error(statusCode);
        return;
      }
      clearCart();
      updateBadge();
      window.location.hash = '#';
      $('#orderedModal').modal('open');
    });
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
    xhr('POST', '/api/v1/session', loginInfo, function (statusCode) {
      if (statusCode >= 400) {
        alert('Неправильный email или пароль');
        return;
      }
      authorize();
    });
  }
}

function submitSettingsForm() {
  var settings = formToObject('form.settings');
  settings = {
    name: settings.changedName,
    phone: settings.changedPhoneNumber,
    street: settings.changedStreet,
    house: settings.changedHouse
  };
  xhr('PUT', '/api/v1/users', settings, function (statusCode) {
    if (statusCode >= 400) {
      Materialize.toast('Неправильный номер телефона');
      return;
    }
    updateUserInfo();
    Materialize.toast('Сохранено', 2000);
  });
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
  });
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
  } else {
    window.location.hash = 'account';
  }
}
function logOutButton() {
  xhr('DELETE', '/api/v1/session', {}, function (statusCode) {
    if (statusCode >= 400) {
      console.error(statusCode);
      return;
    }
    authorized = false;
    setCookie('authorized', false, 999);
    window.location.hash = '#';
  });
}

function shoppingCartButton() {
  if (order.sum > 0) {
    window.location.hash = '#cart';
  } else Materialize.toast('Корзина пуста', 2000);
}

function deliveryButton(orderId, status) {
  if (status === 'preparing') {
    xhr('PUT', '/api/v1/delivery/orders', { 'id': orderId }, function (statusCode) {
      if (statusCode === 403) {
        console.error('forbidden');
        return;
      }
      if (statusCode === 404) {
        console.error('order not found');
        return;
      }
      renderAccountPage();
    });
  }
  if (status === 'delivering') {
    xhr('PUT', '/api/v1/delivery/orders/complete', { 'id': orderId }, function (statusCode) {
      if (statusCode === 403) {
        console.error('forbidden');
        return;
      }
      if (statusCode === 404) {
        console.error('order not found');
        return;
      }
      renderAccountPage();
    });
  }
}

function operatorConfirmButton(orderId, status) {
  console.log(orderId);
  xhr('PUT', '/api/v1/operator/orders', { 'id': orderId }, function (statusCode) {
    if (statusCode === 403) {
      console.error('forbidden');
      return;
    }
    if (statusCode === 404) {
      console.error('order not found');
      return;
    }
    renderAccountPage();
  });
}
function operatorCancelButton(orderId) {
  xhr('PUT', '/api/v1/operator/cancel', { 'id': orderId }, function (statusCode) {
    if (statusCode === 403) {
      console.error('forbidden');
      return;
    }
    if (statusCode === 404) {
      console.error('order not found');
      return;
    }
    renderAccountPage();
  });
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
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  var expires = "expires=" + d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
