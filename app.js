import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { 
  getFirestore, collection, doc, getDocs, setDoc, addDoc, updateDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { 
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

// CONFIGURACIÓN E INICIALIZACIÓN
const firebaseConfig = {
  apiKey: "AIzaSyA-Q-JeopKI_t_u7jnBxcMCmePfvLeSg7k",
  authDomain: "tienda-relojes-gc.firebaseapp.com",
  projectId: "tienda-relojes-gc",
  storageBucket: "tienda-relojes-gc.firebasestorage.app",
  messagingSenderId: "294631718200",
  appId: "1:294631718200:web:3f347b632b40d9690255cd",
  measurementId: "G-9XC15XKTPZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// COLECCIONES
const COL_CONFIG = "relojería_config";
const COL_EMPRESA = "relojería_empresa";
const COL_NAV = "relojería_nav";
const COL_PROMOS = "relojería_promos";
const COL_SECCIONES = "relojería_secciones";
const COL_PRODUCTOS = "relojería_productos";

// ESTADO GLOBAL
let state = {
  isAdmin: false,
  cart: [],
  whatsappNumber: "5493811234567",
  empresa: { nombre: "Tienda de Relojes", logo: "", desc: "" },
  navItems: [],
  promos: [],
  secciones: [],
  productos: [],
  activeSectionId: null
};

// HELPER PARSEO MONEDA
function parseCurrency(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  let str = String(value).trim().replace(/\$/g, "").replace(/\s/g, "");
  if (str.includes(",") && str.includes(".")) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (str.includes(",")) {
    str = str.replace(",", ".");
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

// ARRANQUE Y FIREBASE AUTH
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadAppData();
    applyStylesAndConfig();
    renderAll();
  } catch (error) {
    console.error("Error al inicializar la tienda:", error);
  } finally {
    document.getElementById("loading-screen").classList.add("hidden");
    document.getElementById("app-container").classList.remove("hidden");
  }

  setupEventListeners();

  onAuthStateChanged(auth, (user) => {
    if (user) {
      state.isAdmin = true;
      document.getElementById("admin-bar").classList.remove("hidden");
    } else {
      state.isAdmin = false;
      document.getElementById("admin-bar").classList.add("hidden");
    }
    renderAll();
  });
});

async function loadAppData() {
  const configSnap = await getDocs(collection(db, COL_CONFIG));
  if (!configSnap.empty) {
    const data = configSnap.docs[0].data();
    if (data.whatsapp) state.whatsappNumber = data.whatsapp;
    if (data.headerColor) document.documentElement.style.setProperty("--header-bg", data.headerColor);
    if (data.footerColor) document.documentElement.style.setProperty("--footer-bg", data.footerColor);
    if (data.cardColor) document.documentElement.style.setProperty("--card-bg", data.cardColor);
    if (data.primaryColor) document.documentElement.style.setProperty("--primary-color", data.primaryColor);
    if (data.bgColor) document.documentElement.style.setProperty("--bg-color", data.bgColor);
    if (data.bgImage) document.documentElement.style.setProperty("--bg-image", `url('${data.bgImage}')`);
  }

  const empresaSnap = await getDocs(collection(db, COL_EMPRESA));
  if (!empresaSnap.empty) state.empresa = empresaSnap.docs[0].data();

  const navSnap = await getDocs(collection(db, COL_NAV));
  state.navItems = navSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const promosSnap = await getDocs(collection(db, COL_PROMOS));
  state.promos = promosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const seccionesSnap = await getDocs(collection(db, COL_SECCIONES));
  state.secciones = seccionesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (state.secciones.length > 0 && !state.activeSectionId) {
    state.activeSectionId = state.secciones[0].id;
  }

  const productosSnap = await getDocs(collection(db, COL_PRODUCTOS));
  state.productos = productosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function applyStylesAndConfig() {
  if (state.empresa.nombre) document.getElementById("header-title").innerText = state.empresa.nombre;
  if (state.empresa.desc) document.getElementById("header-desc").innerText = state.empresa.desc;
  if (state.empresa.logo) document.getElementById("header-logo").src = state.empresa.logo;
}

function renderAll() {
  renderNav();
  renderPromos();
  renderSeccionesPills();
  renderProductosPorSeccionActiva();
  renderAdminOptions();
  adjustCartBarLayout(); // Ajusta la vista del carrito inferior sin texto "Ver Pedido"
}

function renderNav() {
  const container = document.getElementById("header-nav");
  container.innerHTML = "";
  state.navItems.forEach(item => {
    const a = document.createElement("a");
    a.className = "nav-link-btn";
    a.href = item.link;
    a.target = "_blank";
    a.innerText = item.nombre;
    container.appendChild(a);
  });
}

function renderPromos() {
  const offersSection = document.getElementById("offers-section");
  const container = document.getElementById("offers-container");
  const prevBtn = document.getElementById("carousel-prev-btn");
  const nextBtn = document.getElementById("carousel-next-btn");

  container.innerHTML = "";
  if (state.promos.length === 0) {
    offersSection.classList.add("hidden");
    return;
  }

  offersSection.classList.remove("hidden");
  if (state.promos.length > 2) {
    prevBtn.classList.remove("hidden");
    nextBtn.classList.remove("hidden");
  } else {
    prevBtn.classList.add("hidden");
    nextBtn.classList.add("hidden");
  }

  state.promos.forEach(promo => {
    const card = document.createElement("div");
    card.className = "promo-card";
    const imgs = (promo.images || "").split(",").map(s => s.trim()).filter(Boolean);
    const mainImg = imgs[0] || "https://via.placeholder.com/300x200?text=Promo";

    card.innerHTML = `
      <div class="product-img-wrapper" onclick="openZoomImage('${mainImg}')">
        <img src="${mainImg}" class="product-img" />
      </div>
      <div class="product-details">
        <div class="product-title">${promo.titulo}</div>
        <div class="product-desc">${promo.descripcion || ""}</div>
        <div class="product-prices">
          ${promo.precioAnterior ? `<span class="old-price">${formatCurrency(parseCurrency(promo.precioAnterior))}</span>` : ""}
          <span class="new-price">${formatCurrency(parseCurrency(promo.precioNuevo))}</span>
        </div>
        <button class="btn-add-cart" type="button" onclick="addToCart('PROMO-${promo.id}', '${promo.titulo.replace(/'/g, "")}', ${parseCurrency(promo.precioNuevo)}, 0, 0, 'minorista', '${mainImg}', 'Promociones')">
          <i class="fa-solid fa-cart-plus"></i> Agregar Promo
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderSeccionesPills() {
  const container = document.getElementById("sections-buttons-container");
  container.innerHTML = "";

  state.secciones.forEach(sec => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `section-pill-btn ${sec.id === state.activeSectionId ? 'active' : ''}`;
    btn.innerText = sec.nombre;
    btn.onclick = () => {
      state.activeSectionId = sec.id;
      renderSeccionesPills();
      renderProductosPorSeccionActiva();
    };
    container.appendChild(btn);
  });
}

function renderProductosPorSeccionActiva() {
  const categoriesContainer = document.getElementById("categories-container");
  categoriesContainer.innerHTML = "";

  if (!state.activeSectionId) return;

  const currentSec = state.secciones.find(s => s.id === state.activeSectionId);
  if (!currentSec) return;

  const prods = state.productos.filter(p => p.seccionId === state.activeSectionId);

  const secBlock = document.createElement("div");
  secBlock.className = "category-block";
  secBlock.innerHTML = `
    <h2 class="section-title"><i class="fa-solid fa-layer-group"></i> ${currentSec.nombre}</h2>
    <div class="products-grid" id="grid-sec-${currentSec.id}"></div>
  `;

  categoriesContainer.appendChild(secBlock);
  const grid = secBlock.querySelector(`#grid-sec-${currentSec.id}`);

  prods.forEach(prod => {
    const pCard = document.createElement("div");
    pCard.className = "product-card";
    const imgUrl = prod.imgUrl || "https://via.placeholder.com/200?text=Sin+Imagen";

    const pMinorista = parseCurrency(prod.precioNuevo);
    const pMayorista = parseCurrency(prod.precioMayorista || 0);
    const minMayorista = parseInt(prod.minMayorista || 2);
    const esAmbos = prod.tipoVenta === "ambos";

    pCard.innerHTML = `
      <div class="product-img-wrapper">
        ${state.isAdmin ? `<div class="quick-edit-pencil" onclick="openQuickEdit('${prod.id}')"><i class="fa-solid fa-pencil"></i></div>` : ""}
        <img src="${imgUrl}" class="product-img" onclick="openZoomImage('${imgUrl}')" />
      </div>
      <div class="product-details">
        <span class="product-code">Cód: ${prod.codigo || "-"}</span>
        <div class="product-title">${prod.titulo}</div>
        <div class="product-desc">${prod.descripcion || ""}</div>
        <div class="product-prices">
          ${prod.precioAnterior ? `<span class="old-price">${formatCurrency(parseCurrency(prod.precioAnterior))}</span>` : ""}
          <span class="new-price">${formatCurrency(pMinorista)}</span>
          ${esAmbos ? `<span class="wholesale-badge">May. ${formatCurrency(pMayorista)} (c/u desde ${minMayorista} u.)</span>` : ""}
        </div>
        <button class="btn-add-cart" type="button" onclick="addToCart('${prod.id}', '${prod.titulo.replace(/'/g, "")}', ${pMinorista}, ${pMayorista}, ${minMayorista}, '${prod.tipoVenta || 'minorista'}', '${imgUrl}', '${currentSec.nombre.replace(/'/g, "")}')">
          <i class="fa-solid fa-cart-plus"></i> Agregar
        </button>
      </div>
    `;
    grid.appendChild(pCard);
  });
}

// ALINEACIÓN Y REORGANIZACIÓN DEL CARRITO INFERIOR
function adjustCartBarLayout() {
  const labelEl = document.querySelector(".cart-bar-label");
  if (labelEl) labelEl.remove(); // Quita el texto "Ver Pedido"

  const cartContent = document.querySelector(".cart-bar-content");
  if (cartContent) {
    cartContent.style.justifyContent = "flex-start";
    cartContent.style.gap = "15px";
  }
}

// CARRITO Y EVALUACIÓN MAYORISTA
window.addToCart = function (id, titulo, precioMin, precioMay, minMay, tipoVenta, img, seccion) {
  const existing = state.cart.find(item => item.id === id);
  if (existing) {
    existing.cantidad++;
  } else {
    state.cart.push({ id, titulo, precioMin, precioMay, minMay, tipoVenta, img, seccion, cantidad: 1 });
  }
  updateCartUI();
};

function getItemCurrentPrice(item) {
  if (item.tipoVenta === "ambos" && item.cantidad >= item.minMay && item.precioMay > 0) {
    return item.precioMay;
  }
  return item.precioMin;
}

function updateCartUI() {
  const totalCount = state.cart.reduce((sum, item) => sum + item.cantidad, 0);
  const totalPrice = state.cart.reduce((sum, item) => sum + (getItemCurrentPrice(item) * item.cantidad), 0);

  document.getElementById("cart-count").innerText = totalCount;
  document.getElementById("cart-total-bar").innerText = formatCurrency(totalPrice);
  document.getElementById("cart-modal-total").innerText = formatCurrency(totalPrice);

  const container = document.getElementById("cart-items-container");
  container.innerHTML = "";

  const grouped = {};
  state.cart.forEach(item => {
    if (!grouped[item.seccion]) grouped[item.seccion] = [];
    grouped[item.seccion].push(item);
  });

  Object.keys(grouped).forEach(secName => {
    const secHeader = document.createElement("div");
    secHeader.style.fontWeight = "bold";
    secHeader.style.marginTop = "10px";
    secHeader.style.color = "var(--primary-color)";
    secHeader.innerText = secName;
    container.appendChild(secHeader);

    grouped[secName].forEach(item => {
      const curPrice = getItemCurrentPrice(item);
      const isWholesaleApplied = item.tipoVenta === "ambos" && item.cantidad >= item.minMay;

      const itemEl = document.createElement("div");
      itemEl.className = "cart-item";
      itemEl.innerHTML = `
        <img src="${item.img}" class="cart-item-img" />
        <div class="cart-item-details">
          <div class="cart-item-title">${item.titulo}</div>
          <div class="cart-item-price">
            ${formatCurrency(curPrice)} ${isWholesaleApplied ? '<span style="color:var(--primary-color); font-size:0.75rem;">(Precio Mayorista)</span>' : ''}
          </div>
        </div>
        <div class="cart-item-controls">
          <button class="btn-qty" type="button" onclick="changeQty('${item.id}', -1)">-</button>
          <span>${item.cantidad}</span>
          <button class="btn-qty" type="button" onclick="changeQty('${item.id}', 1)">+</button>
        </div>
      `;
      container.appendChild(itemEl);
    });
  });
}

window.changeQty = function (id, delta) {
  const item = state.cart.find(i => i.id === id);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) {
    state.cart = state.cart.filter(i => i.id !== id);
  }
  updateCartUI();
};

window.openZoomImage = function (url) {
  document.getElementById("modal-expanded-img").src = url;
  document.getElementById("image-modal").classList.remove("hidden");
};

// LISTENERS GENERALES
function setupEventListeners() {
  document.getElementById("close-image-btn").onclick = () => document.getElementById("image-modal").classList.add("hidden");
  document.getElementById("cart-toggle-btn").onclick = () => document.getElementById("cart-modal").classList.remove("hidden");
  document.getElementById("close-cart-btn").onclick = () => document.getElementById("cart-modal").classList.add("hidden");

  document.getElementById("carousel-prev-btn").onclick = () => {
    document.getElementById("offers-container").scrollBy({ left: -250, behavior: "smooth" });
  };
  document.getElementById("carousel-next-btn").onclick = () => {
    document.getElementById("offers-container").scrollBy({ left: 250, behavior: "smooth" });
  };

  document.getElementById("checkout-whatsapp-btn").onclick = sendWhatsAppOrder;

  const adminBtn = document.getElementById("admin-trigger-btn");
  if (adminBtn) {
    adminBtn.onclick = () => {
      if (state.isAdmin) {
        document.getElementById("admin-bar").classList.toggle("hidden");
      } else {
        document.getElementById("login-modal").classList.remove("hidden");
      }
    };
  }

  document.getElementById("close-login-btn").onclick = () => document.getElementById("login-modal").classList.add("hidden");
  document.getElementById("login-form").onsubmit = handleLogin;
  document.getElementById("admin-logout-btn").onclick = handleLogout;

  setupAdminTabs();

  document.getElementById("save-company-info-btn").onclick = saveCompanyInfo;
  document.getElementById("add-nav-form").onsubmit = addNavItem;
  document.getElementById("promo-form").onsubmit = savePromo;
  document.getElementById("cancel-promo-edit-btn").onclick = resetPromoForm;

  document.getElementById("add-section-form").onsubmit = saveSection;
  document.getElementById("cancel-section-edit-btn").onclick = resetSectionForm;

  document.getElementById("single-product-form").onsubmit = addSingleProduct;
  document.getElementById("btn-generate-batch-table").onclick = generateBatchTable;
  document.getElementById("batch-product-form").onsubmit = saveBatchProducts;

  document.getElementById("save-web-config-btn").onclick = saveWebConfig;

  document.getElementById("close-quick-edit-btn").onclick = () => document.getElementById("quick-edit-modal").classList.add("hidden");
  document.getElementById("quick-edit-form").onsubmit = saveQuickEdit;
  document.getElementById("qe-delete-btn").onclick = deleteProductQuick;

  document.getElementById("prod-sale-type").onchange = (e) => {
    const box = document.getElementById("wholesale-single-fields");
    e.target.value === "ambos" ? box.classList.remove("hidden") : box.classList.add("hidden");
  };

  document.getElementById("batch-sale-type").onchange = (e) => {
    const isWholesale = e.target.value === "ambos";
    document.querySelectorAll(".batch-wholesale-col").forEach(col => {
      isWholesale ? col.classList.remove("hidden") : col.classList.add("hidden");
    });
  };

  document.getElementById("qe-sale-type").onchange = (e) => {
    const box = document.getElementById("wholesale-quick-fields");
    e.target.value === "ambos" ? box.classList.remove("hidden") : box.classList.add("hidden");
  };

  document.getElementById("mode-single-btn").onclick = () => {
    document.getElementById("single-product-form").classList.remove("hidden");
    document.getElementById("batch-product-container").classList.add("hidden");
    document.getElementById("mode-single-btn").classList.add("active");
    document.getElementById("mode-batch-btn").classList.remove("active");
  };

  document.getElementById("mode-batch-btn").onclick = () => {
    document.getElementById("single-product-form").classList.add("hidden");
    document.getElementById("batch-product-container").classList.remove("hidden");
    document.getElementById("mode-batch-btn").classList.add("active");
    document.getElementById("mode-single-btn").classList.remove("active");
  };
}

// ENVÍO DE PEDIDO A WHATSAPP
function sendWhatsAppOrder() {
  if (state.cart.length === 0) return alert("El carrito está vacío");

  let msg = "Hola, deseo realizar esta compra en la tienda:\n\n";
  const grouped = {};
  state.cart.forEach(item => {
    if (!grouped[item.seccion]) grouped[item.seccion] = [];
    grouped[item.seccion].push(item);
  });

  let total = 0;
  Object.keys(grouped).forEach(sec => {
    msg += `*Sección: ${sec}*\n`;
    grouped[sec].forEach(i => {
      const price = getItemCurrentPrice(i);
      const sub = price * i.cantidad;
      total += sub;
      const isWholesale = i.tipoVenta === "ambos" && i.cantidad >= i.minMay;
      msg += `- ${i.titulo} (x${i.cantidad}): ${formatCurrency(sub)} ${isWholesale ? '(Precio Mayorista)' : ''}\n`;
    });
    msg += "\n";
  });

  msg += `*Total a Pagar:* ${formatCurrency(total)}\n\n`;
  msg += "Gracias, aguardo tu mensaje.";

  const link = `https://wa.me/${state.whatsappNumber}?text=${encodeURIComponent(msg)}`;
  window.open(link, "_blank");
}

// LOGIN Y LOGOUT
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-user").value;
  const password = document.getElementById("login-pass").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    document.getElementById("login-modal").classList.add("hidden");
    e.target.reset();
  } catch (error) {
    console.error("Error al autenticar:", error);
    alert("Error de inicio de sesión: Revisa tus datos en Firebase Authentication.");
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
}

function setupAdminTabs() {
  const tabs = ["logo", "nav", "offers", "sections", "products", "config"];
  tabs.forEach(t => {
    const btn = document.getElementById(`btn-tab-${t}`);
    if (btn) {
      btn.onclick = () => {
        tabs.forEach(other => {
          document.getElementById(`btn-tab-${other}`)?.classList.remove("active");
          document.getElementById(`tab-${other}`)?.classList.remove("active");
        });
        btn.classList.add("active");
        document.getElementById(`tab-${t}`).classList.add("active");
      };
    }
  });
}

function renderAdminOptions() {
  if (!state.isAdmin) return;

  const adminHeader = document.querySelector(".admin-bar-header");
  if (adminHeader && !document.getElementById("admin-close-panel-btn")) {
    const closePanelBtn = document.createElement("button");
    closePanelBtn.id = "admin-close-panel-btn";
    closePanelBtn.type = "button";
    closePanelBtn.className = "close-btn";
    closePanelBtn.style.fontSize = "1.5rem";
    closePanelBtn.style.lineHeight = "1";
    closePanelBtn.style.marginLeft = "10px";
    closePanelBtn.innerHTML = "&times;";
    closePanelBtn.title = "Ocultar Panel (Mantener Sesión)";
    closePanelBtn.onclick = () => {
      document.getElementById("admin-bar").classList.add("hidden");
    };
    adminHeader.appendChild(closePanelBtn);
  }

  const sel1 = document.getElementById("prod-section-select");
  const sel2 = document.getElementById("batch-prod-section-select");
  sel1.innerHTML = "";
  sel2.innerHTML = "";
  state.secciones.forEach(s => {
    sel1.innerHTML += `<option value="${s.id}">${s.nombre}</option>`;
    sel2.innerHTML += `<option value="${s.id}">${s.nombre}</option>`;
  });

  const navList = document.getElementById("admin-nav-list");
  navList.innerHTML = "";
  state.navItems.forEach(n => {
    navList.innerHTML += `
      <div class="admin-list-item">
        <span>${n.nombre}</span>
        <button class="btn-danger" type="button" style="width:auto; padding:2px 8px;" onclick="deleteNavItem('${n.id}')">X</button>
      </div>
    `;
  });

  const secList = document.getElementById("admin-sections-list");
  secList.innerHTML = "";
  state.secciones.forEach(s => {
    secList.innerHTML += `
      <div class="admin-list-item">
        <span>${s.nombre}</span>
        <div class="item-actions">
          <button class="btn-edit-sm" type="button" onclick="editSection('${s.id}')">Editar</button>
          <button class="btn-danger" type="button" style="width:auto; padding:2px 8px;" onclick="deleteSection('${s.id}')">X</button>
        </div>
      </div>
    `;
  });

  const promsList = document.getElementById("admin-promos-list");
  promsList.innerHTML = "";
  state.promos.forEach(p => {
    promsList.innerHTML += `
      <div class="admin-list-item">
        <span>${p.titulo}</span>
        <div class="item-actions">
          <button class="btn-edit-sm" type="button" onclick="editPromo('${p.id}')">Editar</button>
          <button class="btn-danger" type="button" style="width:auto; padding:2px 8px;" onclick="deletePromo('${p.id}')">X</button>
        </div>
      </div>
    `;
  });

  document.getElementById("admin-company-name").value = state.empresa.nombre || "";
  document.getElementById("admin-company-logo").value = state.empresa.logo || "";
  document.getElementById("admin-company-desc").value = state.empresa.desc || "";
  document.getElementById("admin-whatsapp-num").value = state.whatsappNumber || "";
}

async function saveCompanyInfo() {
  const nombre = document.getElementById("admin-company-name").value;
  const logo = document.getElementById("admin-company-logo").value;
  const desc = document.getElementById("admin-company-desc").value;

  state.empresa = { nombre, logo, desc };
  const snap = await getDocs(collection(db, COL_EMPRESA));
  if (snap.empty) {
    await addDoc(collection(db, COL_EMPRESA), state.empresa);
  } else {
    await updateDoc(doc(db, COL_EMPRESA, snap.docs[0].id), state.empresa);
  }
  applyStylesAndConfig();
  alert("Información guardada");
}

async function addNavItem(e) {
  e.preventDefault();
  const nombre = document.getElementById("nav-item-name").value;
  const link = document.getElementById("nav-item-link").value;
  const ref = await addDoc(collection(db, COL_NAV), { nombre, link });
  state.navItems.push({ id: ref.id, nombre, link });
  renderNav();
  renderAdminOptions();
  e.target.reset();
}

window.deleteNavItem = async function (id) {
  await deleteDoc(doc(db, COL_NAV, id));
  state.navItems = state.navItems.filter(i => i.id !== id);
  renderNav();
  renderAdminOptions();
};

async function saveSection(e) {
  e.preventDefault();
  const id = document.getElementById("section-edit-id").value;
  const nombre = document.getElementById("section-name-input").value;

  if (id) {
    await updateDoc(doc(db, COL_SECCIONES, id), { nombre });
    const idx = state.secciones.findIndex(s => s.id === id);
    if (idx !== -1) state.secciones[idx].nombre = nombre;
  } else {
    const ref = await addDoc(collection(db, COL_SECCIONES), { nombre });
    state.secciones.push({ id: ref.id, nombre });
    if (!state.activeSectionId) state.activeSectionId = ref.id;
  }

  resetSectionForm();
  renderAll();
}

window.editSection = function (id) {
  const sec = state.secciones.find(s => s.id === id);
  if (!sec) return;

  document.getElementById("section-edit-id").value = sec.id;
  document.getElementById("section-name-input").value = sec.nombre;
  document.getElementById("save-section-btn").innerText = "Guardar Cambios";
  document.getElementById("cancel-section-edit-btn").classList.remove("hidden");
};

function resetSectionForm() {
  document.getElementById("section-edit-id").value = "";
  document.getElementById("section-name-input").value = "";
  document.getElementById("save-section-btn").innerText = "Crear Sección";
  document.getElementById("cancel-section-edit-btn").classList.add("hidden");
}

window.deleteSection = async function (id) {
  if (!confirm("¿Seguro que deseas eliminar esta sección?")) return;
  await deleteDoc(doc(db, COL_SECCIONES, id));
  state.secciones = state.secciones.filter(s => s.id !== id);
  if (state.activeSectionId === id) {
    state.activeSectionId = state.secciones.length > 0 ? state.secciones[0].id : null;
  }
  renderAll();
};

async function savePromo(e) {
  e.preventDefault();
  const editId = document.getElementById("promo-edit-id").value;
  const promoData = {
    titulo: document.getElementById("promo-title").value,
    descripcion: document.getElementById("promo-desc").value,
    precioAnterior: document.getElementById("promo-old-price").value,
    precioNuevo: document.getElementById("promo-new-price").value,
    images: document.getElementById("promo-images-urls").value
  };

  if (editId) {
    await updateDoc(doc(db, COL_PROMOS, editId), promoData);
    const idx = state.promos.findIndex(p => p.id === editId);
    if (idx !== -1) state.promos[idx] = { id: editId, ...promoData };
  } else {
    const ref = await addDoc(collection(db, COL_PROMOS), promoData);
    state.promos.push({ id: ref.id, ...promoData });
  }

  resetPromoForm();
  renderPromos();
  renderAdminOptions();
}

window.editPromo = function (id) {
  const promo = state.promos.find(p => p.id === id);
  if (!promo) return;

  document.getElementById("promo-edit-id").value = promo.id;
  document.getElementById("promo-title").value = promo.titulo;
  document.getElementById("promo-desc").value = promo.descripcion || "";
  document.getElementById("promo-old-price").value = promo.precioAnterior || "";
  document.getElementById("promo-new-price").value = promo.precioNuevo || "";
  document.getElementById("promo-images-urls").value = promo.images || "";

  document.getElementById("save-promo-btn").innerText = "Guardar Cambios de Promo";
  document.getElementById("cancel-promo-edit-btn").classList.remove("hidden");
};

function resetPromoForm() {
  document.getElementById("promo-edit-id").value = "";
  document.getElementById("promo-form").reset();
  document.getElementById("save-promo-btn").innerText = "Guardar Promoción";
  document.getElementById("cancel-promo-edit-btn").classList.add("hidden");
}

window.deletePromo = async function (id) {
  if (!confirm("¿Eliminar esta promoción?")) return;
  await deleteDoc(doc(db, COL_PROMOS, id));
  state.promos = state.promos.filter(p => p.id !== id);
  renderPromos();
  renderAdminOptions();
};

async function addSingleProduct(e) {
  e.preventDefault();
  const tipoVenta = document.getElementById("prod-sale-type").value;
  const prod = {
    seccionId: document.getElementById("prod-section-select").value,
    tipoVenta: tipoVenta,
    codigo: document.getElementById("prod-code").value,
    titulo: document.getElementById("prod-title").value,
    descripcion: document.getElementById("prod-desc").value,
    precioAnterior: document.getElementById("prod-old-price").value,
    precioNuevo: document.getElementById("prod-new-price").value,
    precioMayorista: tipoVenta === "ambos" ? document.getElementById("prod-wholesale-price").value : "",
    minMayorista: tipoVenta === "ambos" ? document.getElementById("prod-wholesale-min").value : "2",
    imgUrl: document.getElementById("prod-img-url").value
  };

  const ref = await addDoc(collection(db, COL_PRODUCTOS), prod);
  state.productos.push({ id: ref.id, ...prod });
  renderProductosPorSeccionActiva();
  e.target.reset();
  document.getElementById("wholesale-single-fields").classList.add("hidden");
  alert("Producto creado");
}

function generateBatchTable() {
  const prefix = document.getElementById("batch-code-prefix").value || "GC";
  const start = parseInt(document.getElementById("batch-code-start").value) || 1;
  const qty = parseInt(document.getElementById("batch-quantity").value) || 1;
  const tipoVenta = document.getElementById("batch-sale-type").value;
  const isWholesale = tipoVenta === "ambos";

  const tbody = document.getElementById("batch-table-body");
  tbody.innerHTML = "";

  for (let i = 0; i < qty; i++) {
    const codeNum = start + i;
    const codeStr = `${prefix}${codeNum < 10 ? '0' + codeNum : codeNum}`;

    const tr = document.createElement("tr");
    tr.className = "batch-row";

    tr.innerHTML = `
      <td><input type="text" class="b-code" value="${codeStr}" required /></td>
      <td><input type="text" class="b-title" placeholder="Modelo ${codeNum}" required /></td>
      <td><input type="text" class="b-desc" placeholder="Detalles" /></td>
      <td><input type="text" class="b-old-price" placeholder="0.00" /></td>
      <td><input type="text" class="b-new-price" placeholder="0.00" required /></td>
      <td class="batch-wholesale-col ${isWholesale ? '' : 'hidden'}"><input type="text" class="b-wholesale-price" placeholder="0.00" /></td>
      <td class="batch-wholesale-col ${isWholesale ? '' : 'hidden'}"><input type="number" class="b-wholesale-min" value="2" min="2" /></td>
      <td><input type="text" class="b-img" placeholder="https://..." /></td>
    `;
    tbody.appendChild(tr);
  }

  document.getElementById("batch-product-form").classList.remove("hidden");
}

async function saveBatchProducts(e) {
  e.preventDefault();
  const secId = document.getElementById("batch-prod-section-select").value;
  const tipoVenta = document.getElementById("batch-sale-type").value;
  const rows = document.querySelectorAll(".batch-row");

  if (rows.length === 0) return alert("Primero genera las filas de la tanda.");

  for (const row of rows) {
    const prod = {
      seccionId: secId,
      tipoVenta: tipoVenta,
      codigo: row.querySelector(".b-code").value,
      titulo: row.querySelector(".b-title").value,
      descripcion: row.querySelector(".b-desc").value,
      precioAnterior: row.querySelector(".b-old-price").value,
      precioNuevo: row.querySelector(".b-new-price").value,
      precioMayorista: tipoVenta === "ambos" ? row.querySelector(".b-wholesale-price").value : "",
      minMayorista: tipoVenta === "ambos" ? row.querySelector(".b-wholesale-min").value : "2",
      imgUrl: row.querySelector(".b-img").value
    };

    const ref = await addDoc(collection(db, COL_PRODUCTOS), prod);
    state.productos.push({ id: ref.id, ...prod });
  }

  renderProductosPorSeccionActiva();
  document.getElementById("batch-table-body").innerHTML = "";
  document.getElementById("batch-product-form").classList.add("hidden");
  alert(`Se guardaron ${rows.length} productos en la base de datos.`);
}

async function saveWebConfig() {
  const whatsapp = document.getElementById("admin-whatsapp-num").value;
  const headerColor = document.getElementById("admin-color-header").value;
  const footerColor = document.getElementById("admin-color-footer").value;
  const cardColor = document.getElementById("admin-color-card").value;
  const primaryColor = document.getElementById("admin-color-primary").value;
  const bgColor = document.getElementById("admin-color-bg").value;
  const bgImage = document.getElementById("admin-bg-image-url").value;

  state.whatsappNumber = whatsapp;
  document.documentElement.style.setProperty("--header-bg", headerColor);
  document.documentElement.style.setProperty("--footer-bg", footerColor);
  document.documentElement.style.setProperty("--card-bg", cardColor);
  document.documentElement.style.setProperty("--primary-color", primaryColor);
  document.documentElement.style.setProperty("--bg-color", bgColor);
  document.documentElement.style.setProperty("--bg-image", bgImage ? `url('${bgImage}')` : "none");

  const configData = { whatsapp, headerColor, footerColor, cardColor, primaryColor, bgColor, bgImage };
  const snap = await getDocs(collection(db, COL_CONFIG));
  if (snap.empty) {
    await addDoc(collection(db, COL_CONFIG), configData);
  } else {
    await updateDoc(doc(db, COL_CONFIG, snap.docs[0].id), configData);
  }
  alert("Configuración web guardada");
}

// QUICK EDIT (LAPCITO)
window.openQuickEdit = function (prodId) {
  const prod = state.productos.find(p => p.id === prodId);
  if (!prod) return;

  document.getElementById("qe-prod-id").value = prod.id;
  document.getElementById("qe-sale-type").value = prod.tipoVenta || "minorista";
  document.getElementById("qe-prod-title").value = prod.titulo;
  document.getElementById("qe-prod-desc").value = prod.descripcion || "";
  document.getElementById("qe-prod-old-price").value = prod.precioAnterior || "";
  document.getElementById("qe-prod-new-price").value = prod.precioNuevo || "";
  document.getElementById("qe-wholesale-price").value = prod.precioMayorista || "";
  document.getElementById("qe-wholesale-min").value = prod.minMayorista || "2";
  document.getElementById("qe-prod-img-url").value = prod.imgUrl || "";

  const box = document.getElementById("wholesale-quick-fields");
  prod.tipoVenta === "ambos" ? box.classList.remove("hidden") : box.classList.add("hidden");

  document.getElementById("quick-edit-modal").classList.remove("hidden");
};

async function saveQuickEdit(e) {
  e.preventDefault();
  const id = document.getElementById("qe-prod-id").value;
  const tipoVenta = document.getElementById("qe-sale-type").value;

  const updated = {
    tipoVenta: tipoVenta,
    titulo: document.getElementById("qe-prod-title").value,
    descripcion: document.getElementById("qe-prod-desc").value,
    precioAnterior: document.getElementById("qe-prod-old-price").value,
    precioNuevo: document.getElementById("qe-prod-new-price").value,
    precioMayorista: tipoVenta === "ambos" ? document.getElementById("qe-wholesale-price").value : "",
    minMayorista: tipoVenta === "ambos" ? document.getElementById("qe-wholesale-min").value : "2",
    imgUrl: document.getElementById("qe-prod-img-url").value
  };

  await updateDoc(doc(db, COL_PRODUCTOS, id), updated);
  const idx = state.productos.findIndex(p => p.id === id);
  if (idx !== -1) state.productos[idx] = { ...state.productos[idx], ...updated };

  renderProductosPorSeccionActiva();
  document.getElementById("quick-edit-modal").classList.add("hidden");
}

async function deleteProductQuick() {
  const id = document.getElementById("qe-prod-id").value;
  if (!confirm("¿Seguro que deseas eliminar este producto?")) return;

  await deleteDoc(doc(db, COL_PRODUCTOS, id));
  state.productos = state.productos.filter(p => p.id !== id);
  renderProductosPorSeccionActiva();
  document.getElementById("quick-edit-modal").classList.add("hidden");
}
