import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// ==========================================================================
// 1. CONFIGURACIÓN DE FIREBASE Y STORAGE
// ==========================================================================
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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const NUMERO_WHATSAPP = "5493816900041"; 
let productos = [];
let secciones = ["Relojes"]; // Categoría por defecto
let carrito = [];
let zoomScale = 1;
let seccionFiltroAdmin = "TODAS";

// ==========================================================================
// 2. INICIALIZACIÓN Y FIRESTORE
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    inicializarModalZoom();
    obtenerDatosFirestore();
    configurarEventos();
});

async function obtenerDatosFirestore() {
    try {
        // Cargar Secciones
        const seccionesSnap = await getDocs(collection(db, "secciones"));
        const listaSecciones = [];
        seccionesSnap.forEach(d => listaSecciones.push(d.data().nombre));
        if (listaSecciones.length > 0) {
            secciones = Array.from(new Set(["Relojes", ...listaSecciones]));
        }

        // Cargar Productos
        const querySnapshot = await getDocs(collection(db, "productos"));
        productos = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (!data.seccion) data.seccion = "Relojes"; // Retrocompatibilidad
            productos.push(data);
        });
        
        renderizarFiltrosCatalogo();
        renderizarCatalogo();
        if (auth.currentUser) renderizarPanelAdmin();
    } catch (error) {
        console.error("Error al conectar con Firestore:", error);
    }
}

// ==========================================================================
// 3. CATALOGO Y FILTROS POR SECCIÓN
// ==========================================================================
function renderizarFiltrosCatalogo() {
    let containerFiltros = document.getElementById("contenedorFiltrosSecciones");
    if (!containerFiltros) {
        const grid = document.getElementById("gridProductos");
        if (grid && grid.parentElement) {
            containerFiltros = document.createElement("div");
            containerFiltros.id = "contenedorFiltrosSecciones";
            containerFiltros.style.cssText = "display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-bottom:20px;";
            grid.parentElement.insertBefore(containerFiltros, grid);
        }
    }

    if (!containerFiltros) return;
    containerFiltros.innerHTML = `
        <button onclick="filtrarCatalogoSeccion('TODAS')" class="btn-filtro-sec active" style="padding:6px 14px; border:1px solid var(--gold); background:#000; color:var(--gold); border-radius:20px; cursor:pointer;">Todas</button>
    `;

    secciones.forEach(sec => {
        const btn = document.createElement("button");
        btn.className = "btn-filtro-sec";
        btn.style.cssText = "padding:6px 14px; border:1px solid #444; background:#111; color:#fff; border-radius:20px; cursor:pointer;";
        btn.innerText = sec;
        btn.onclick = () => filtrarCatalogoSeccion(sec);
        containerFiltros.appendChild(btn);
    });
}

window.filtrarCatalogoSeccion = function(seccionNombre) {
    renderizarCatalogo(seccionNombre);
};

function renderizarCatalogo(filtroSeccion = "TODAS") {
    const grid = document.getElementById("gridProductos");
    if (!grid) return;

    // Aseguramos que el contenedor principal mantenga estilo de bloque para las secciones agrupadas
    grid.style.display = "block";
    grid.innerHTML = "";

    // 1. SI SE FILTRA POR UNA SECCIÓN ESPECÍFICA (ej: Relojes o Cadenas)
    if (filtroSeccion !== "TODAS") {
        const prodsFiltrados = productos.filter(p => (p.seccion || "Relojes") === filtroSeccion);

        if (prodsFiltrados.length === 0) {
            grid.innerHTML = "<p style='color:#aaa; text-align:center; padding:40px;'>No hay productos cargados en esta sección.</p>";
            return;
        }

        // Título de la sección seleccionada
        const tituloSeccion = document.createElement("h2");
        tituloSeccion.style.cssText = "color:var(--gold); border-bottom:1px solid #333; padding-bottom:10px; margin:20px 0 15px 0; text-transform:uppercase; font-size:1.4rem;";
        tituloSeccion.innerText = filtroSeccion;
        grid.appendChild(tituloSeccion);

        // Sub-contenedor con el Grid de tarjetas (evita que 1 solo producto ocupe toda la pantalla)
        const subGrid = document.createElement("div");
        subGrid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;";

        prodsFiltrados.forEach(prod => subGrid.appendChild(crearTarjetaProducto(prod)));
        grid.appendChild(subGrid);
        return;
    }

    // 2. VISTA "TODAS": AGRUPADO Y SEPARADO POR SECCIONES
    if (productos.length === 0) {
        grid.innerHTML = "<p style='color:#aaa; text-align:center; padding:40px;'>No hay productos disponibles.</p>";
        return;
    }

    // Agrupar productos por categoría
    const productosPorSeccion = {};
    secciones.forEach(sec => productosPorSeccion[sec] = []);
    
    productos.forEach(prod => {
        const sec = prod.seccion || "Relojes";
        if (!productosPorSeccion[sec]) productosPorSeccion[sec] = [];
        productosPorSeccion[sec].push(prod);
    });

    // Renderizar cada sección con su título y sus respectivos cuadritos
    Object.keys(productosPorSeccion).forEach(secNombre => {
        const lista = productosPorSeccion[secNombre];
        if (lista.length > 0) {
            // Título de sección (RELOJES, CADENAS, ETC.)
            const tituloSeccion = document.createElement("h2");
            tituloSeccion.style.cssText = "color:var(--gold); border-bottom:1px solid #333; padding-bottom:8px; margin:25px 0 15px 0; text-transform:uppercase; font-size:1.3rem; text-align:left;";
            tituloSeccion.innerText = secNombre;
            grid.appendChild(tituloSeccion);

            // Grid de tarjetas adaptativo
            const subGrid = document.createElement("div");
            subGrid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;";

            lista.forEach(prod => subGrid.appendChild(crearTarjetaProducto(prod)));
            grid.appendChild(subGrid);
        }
    });
}

// Función auxiliar para construir la tarjeta idéntica en todas las secciones
function crearTarjetaProducto(prod) {
    const card = document.createElement("div");
    card.className = "product-card";

    const tienePrecioViejo = prod.precioViejo && Number(prod.precioViejo) > Number(prod.precioNuevo);
    const htmlPrecioViejo = tienePrecioViejo 
        ? `<span class="price-old" style="text-decoration: line-through; color: #888; margin-right: 8px;">$${Number(prod.precioViejo).toLocaleString()}</span>` 
        : '';

    card.innerHTML = `
        <span class="product-code">${prod.codigo}</span>
        <div class="product-image-container" style="cursor:zoom-in;">
            <img src="${prod.imagen}" alt="${prod.nombre}" class="product-image" onclick="abrirModalZoom('${prod.imagen}', '${prod.nombre}')">
        </div>
        <h3 class="product-title">${prod.nombre}</h3>
        <p class="product-description">${prod.descripcion || ''}</p>
        <div class="price-container">
            ${htmlPrecioViejo}
            <span class="price-new">$${Number(prod.precioNuevo).toLocaleString()}</span>
        </div>
        <button class="btn-add-cart" onclick="agregarAlCarrito('${prod.codigo}')">
            <i class="fas fa-cart-plus"></i> Agregar al Carrito
        </button>
    `;
    return card;
}

// ==========================================================================
// 4. VISOR DE IMAGEN CON ZOOM (PANTALLA COMPLETA)
// ==========================================================================
function inicializarModalZoom() {
    if (document.getElementById("modalZoomImagen")) return;

    const modal = document.createElement("div");
    modal.id = "modalZoomImagen";
    modal.style.cssText = `
        display: none; position: fixed; z-index: 99999; left: 0; top: 0; width: 100%; height: 100%;
        background-color: rgba(0,0,0,0.9); overflow: hidden; align-items: center; justify-content: center; flex-direction: column;
    `;

    modal.innerHTML = `
        <div style="position:absolute; top:15px; right:20px; display:flex; gap:10px; z-index:100000;">
            <button onclick="cambiarZoom(0.25)" style="background:#222; color:#fff; border:1px solid #555; font-size:1.2rem; width:40px; height:40px; border-radius:50%; cursor:pointer;">+</button>
            <button onclick="cambiarZoom(-0.25)" style="background:#222; color:#fff; border:1px solid #555; font-size:1.2rem; width:40px; height:40px; border-radius:50%; cursor:pointer;">-</button>
            <button onclick="restablecerZoom()" style="background:#222; color:#fff; border:1px solid #555; font-size:0.8rem; height:40px; padding:0 10px; border-radius:20px; cursor:pointer;">1:1</button>
            <button onclick="cerrarModalZoom()" style="background:#e74c3c; color:#fff; border:none; font-size:1.2rem; width:40px; height:40px; border-radius:50%; cursor:pointer;">✕</button>
        </div>
        <div id="wrapperZoomImg" style="max-width:90%; max-height:85%; overflow:auto; display:flex; justify-content:center; align-items:center;">
            <img id="imgModalZoom" src="" alt="Zoom" style="max-width:100%; max-height:80vh; transition: transform 0.2s ease, max-width 0.2s ease; object-fit:contain;">
        </div>
        <div id="captionZoomImg" style="color:var(--gold); margin-top:10px; font-weight:bold; font-size:1.1rem; text-align:center;"></div>
    `;

    document.body.appendChild(modal);
}

window.abrirModalZoom = function(src, nombre) {
    const modal = document.getElementById("modalZoomImagen");
    const img = document.getElementById("imgModalZoom");
    const caption = document.getElementById("captionZoomImg");
    if (!modal || !img) return;

    img.src = src;
    caption.innerText = nombre || "";
    zoomScale = 1;
    img.style.transform = `scale(${zoomScale})`;
    modal.style.display = "flex";
};

window.cerrarModalZoom = function() {
    const modal = document.getElementById("modalZoomImagen");
    if (modal) modal.style.display = "none";
};

window.cambiarZoom = function(delta) {
    const img = document.getElementById("imgModalZoom");
    if (!img) return;
    zoomScale = Math.max(0.5, Math.min(zoomScale + delta, 4));
    img.style.transform = `scale(${zoomScale})`;
};

window.restablecerZoom = function() {
    const img = document.getElementById("imgModalZoom");
    if (!img) return;
    zoomScale = 1;
    img.style.transform = `scale(1)`;
};

// ==========================================================================
// 5. CARRITO Y WHATSAPP
// ==========================================================================
window.agregarAlCarrito = function(codigo) {
    const producto = productos.find(p => p.codigo === codigo);
    if (producto) {
        carrito.push(producto);
        actualizarCarritoUI();
        abrirCarrito();
    }
};

window.eliminarDelCarrito = function(index) {
    carrito.splice(index, 1);
    actualizarCarritoUI();
};

function actualizarCarritoUI() {
    const cartCount = document.getElementById("cartCount");
    const cartItems = document.getElementById("cartItems");
    const cartTotalSum = document.getElementById("cartTotalSum");

    if (cartCount) cartCount.innerText = carrito.length;
    if (!cartItems) return;

    cartItems.innerHTML = "";
    let total = 0;

    if (carrito.length === 0) {
        cartItems.innerHTML = "<p style='text-align:center; color:#888;'>Tu carrito está vacío.</p>";
    } else {
        carrito.forEach((prod, idx) => {
            total += Number(prod.precioNuevo);
            const item = document.createElement("div");
            item.className = "cart-item";
            item.innerHTML = `
                <div>
                    <div class="cart-item-title">${prod.nombre}</div>
                    <div class="cart-item-code">${prod.codigo} (${prod.seccion || 'Relojes'})</div>
                    <div class="cart-item-price">$${Number(prod.precioNuevo).toLocaleString()}</div>
                </div>
                <button class="btn-remove-item" onclick="eliminarDelCarrito(${idx})">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;
            cartItems.appendChild(item);
        });
    }

    if (cartTotalSum) cartTotalSum.innerText = `$${total.toLocaleString()}`;
}

function enviarPedidoWhatsApp() {
    if (carrito.length === 0) {
        alert("Agregá al menos un producto al carrito.");
        return;
    }

    let mensaje = "Hola Gabriel, quiero realizar la compra de los siguientes productos:\n\n";
    let total = 0;

    carrito.forEach((prod, index) => {
        const precio = Number(prod.precioNuevo);
        mensaje += `${index + 1}. *${prod.nombre}*\n`;
        mensaje += `   Categoría: ${prod.seccion || 'Relojes'}\n`;
        mensaje += `   Código: ${prod.codigo}\n`;
        mensaje += `   Precio: $${precio.toLocaleString()}\n\n`;
        total += precio;
    });

    mensaje += `*TOTAL DEL PEDIDO: $${total.toLocaleString()}*\n\n`;
    mensaje += "Quedo a la espera de su respuesta. ¡Muchas gracias!";

    const url = `https://api.whatsapp.com/send?phone=${NUMERO_WHATSAPP}&text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
}

// ==========================================================================
// 6. PANEL DE ADMINISTRACIÓN SEPARADO (PRODUCTOS, SECCIONES Y CREACIÓN)
// ==========================================================================
function renderizarPanelAdmin() {
    const listContainer = document.getElementById("adminProductsList");
    if (!listContainer) return;

    const opcionesSeccionesHTML = secciones.map(s => `<option value="${s}">${s}</option>`).join("");

    listContainer.innerHTML = `
        <!-- Botonera Admin -->
        <div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:space-between; align-items:center; margin-bottom:15px; background:#181818; padding:10px; border-radius:6px; border:1px solid #333;">
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button onclick="mostrarAdminTab('nuevo')" class="btn-gold" style="font-size:0.8rem; padding:6px 10px;">
                    <i class="fas fa-plus"></i> + Nuevo Producto
                </button>
                <button onclick="mostrarAdminTab('existentes')" style="background:#222; color:var(--gold); border:1px solid var(--gold); font-size:0.8rem; padding:6px 10px; border-radius:4px; cursor:pointer;">
                    <i class="fas fa-boxes"></i> Ver Productos Cargados
                </button>
                <button onclick="mostrarAdminTab('secciones')" style="background:#222; color:#fff; border:1px solid #555; font-size:0.8rem; padding:6px 10px; border-radius:4px; cursor:pointer;">
                    <i class="fas fa-tags"></i> Gestor de Secciones
                </button>
            </div>
            <button onclick="cerrarSesionAdmin()" style="background:#e74c3c; color:#fff; border:none; padding:6px 10px; font-weight:bold; border-radius:4px; cursor:pointer; font-size:0.8rem;">
                <i class="fas fa-sign-out-alt"></i> Salir
            </button>
        </div>

        <!-- SECCIÓN: AGREGAR NUEVO PRODUCTO -->
        <div id="tabAdminNuevo" style="display:block;" class="admin-form-group">
            <h4 style="color:var(--gold); margin-bottom:10px;">Agregar Nuevo Producto</h4>
            
            <label style="color:#aaa; font-size:0.8rem; display:block; margin-top:5px;">Sección / Categoría:</label>
            <select id="newSeccion" style="width:100%; padding:8px; background:#222; color:#fff; border:1px solid #444; border-radius:4px; margin-bottom:8px;">
                ${opcionesSeccionesHTML}
            </select>

            <label style="color:#aaa; font-size:0.8rem; display:block; margin-top:5px;">Código:</label>
            <input type="text" id="newCodigo" placeholder="Código (ej: GC-011)">
            
            <label style="color:#aaa; font-size:0.8rem; display:block; margin-top:5px;">Nombre:</label>
            <input type="text" id="newNombre" placeholder="Nombre del producto">
            
            <label style="color:#aaa; font-size:0.8rem; display:block; margin-top:5px;">Descripción:</label>
            <input type="text" id="newDescripcion" placeholder="Descripción o características">
            
            <label style="color:#aaa; font-size:0.8rem; display:block; margin-top:5px;">Precio Anterior / Tachado ($):</label>
            <input type="number" id="newPrecioViejo" placeholder="Precio Anterior (Opcional)">
            
            <label style="color:#aaa; font-size:0.8rem; display:block; margin-top:5px;">Precio Nuevo / Actual ($):</label>
            <input type="number" id="newPrecio" placeholder="Precio Nuevo">
            
            <label style="color:#aaa; font-size:0.8rem; display:block; margin-top:10px; font-weight:bold;">Imagen (Elegí una opción):</label>
            <input type="url" id="newImagenUrl" placeholder="Opción A: Pegar URL de la imagen" style="margin-bottom:5px;">
            <label style="color:#888; font-size:0.75rem; display:block;">Opción B: Subir archivo desde tu dispositivo:</label>
            <input type="file" id="newImagenFile" accept="image/*" style="margin-bottom:10px;">

            <button onclick="agregarNuevoProducto()" id="btnGuardarNuevo" class="btn-gold" style="margin-top:10px; width:100%;">
                <i class="fas fa-save"></i> Guardar en Catálogo
            </button>
        </div>

        <!-- SECCIÓN: VER PRODUCTOS EXISTENTES -->
        <div id="tabAdminExistentes" style="display:none;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h4 style="color:var(--gold); margin:0;">Productos Cargados</h4>
                <select id="filtroAdminSeccionSelect" onchange="filtrarAdminPorSeccion(this.value)" style="padding:6px; background:#222; color:#fff; border:1px solid var(--gold); border-radius:4px; font-size:0.8rem;">
                    <option value="TODAS">Ver Todas las Secciones</option>
                    ${opcionesSeccionesHTML}
                </select>
            </div>
            <div id="contenedorListaAdminExistentes"></div>
        </div>

        <!-- SECCIÓN: GESTOR DE SECCIONES -->
        <div id="tabAdminSecciones" style="display:none;" class="admin-form-group">
            <h4 style="color:var(--gold); margin-bottom:10px;">Crear Nueva Sección / Categoría</h4>
            <div style="display:flex; gap:8px;">
                <input type="text" id="nuevaSeccionNombre" placeholder="Nombre de sección (ej: Perfumes)" style="flex:1;">
                <button onclick="crearNuevaSeccion()" class="btn-gold" style="white-space:nowrap;">+ Crear</button>
            </div>
            
            <hr style="border-color:#333; margin:15px 0;">
            <h5 style="color:#aaa; margin-bottom:8px;">Secciones Existentes:</h5>
            <ul id="listaSeccionesAdmin" style="list-style:none; padding:0; margin:0;"></ul>
        </div>
    `;

    renderizarListaAdminExistentes();
    renderizarListaSeccionesAdmin();
}

window.mostrarAdminTab = function(tabName) {
    const tabNuevo = document.getElementById("tabAdminNuevo");
    const tabExistentes = document.getElementById("tabAdminExistentes");
    const tabSecciones = document.getElementById("tabAdminSecciones");

    if (tabNuevo) tabNuevo.style.display = tabName === "nuevo" ? "block" : "none";
    if (tabExistentes) tabExistentes.style.display = tabName === "existentes" ? "block" : "none";
    if (tabSecciones) tabSecciones.style.display = tabName === "secciones" ? "block" : "none";
};

window.filtrarAdminPorSeccion = function(seccion) {
    seccionFiltroAdmin = seccion;
    renderizarListaAdminExistentes();
};

function renderizarListaAdminExistentes() {
    const listContainer = document.getElementById("contenedorListaAdminExistentes");
    if (!listContainer) return;
    listContainer.innerHTML = "";

    const prodsFiltrados = seccionFiltroAdmin === "TODAS"
        ? productos
        : productos.filter(p => (p.seccion || "Relojes") === seccionFiltroAdmin);

    if (prodsFiltrados.length === 0) {
        listContainer.innerHTML = "<p style='color:#888; text-align:center;'>No hay productos en esta sección.</p>";
        return;
    }

    prodsFiltrados.forEach((prod) => {
        const item = document.createElement("div");
        item.style.cssText = "background:#111; padding:12px; margin-bottom:12px; border:1px solid #333; border-radius:6px;";
        
        const opcionesSec = secciones.map(s => `
            <option value="${s}" ${s === (prod.seccion || 'Relojes') ? 'selected' : ''}>${s}</option>
        `).join("");

        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--gold); font-weight:bold; margin-bottom:5px;">
                <span>CÓDIGO: ${prod.codigo}</span>
                <span style="color:#aaa;">Sección: ${prod.seccion || 'Relojes'}</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
                <label style="color:#aaa; font-size:0.75rem;">Sección:</label>
                <select id="editSeccion_${prod.codigo}" style="padding:6px; background:#222; color:#fff; border:1px solid #444; border-radius:4px;">
                    ${opcionesSec}
                </select>

                <label style="color:#aaa; font-size:0.75rem;">Nombre del Producto:</label>
                <input type="text" id="editNombre_${prod.codigo}" value="${prod.nombre}">
                
                <label style="color:#aaa; font-size:0.75rem;">Descripción del Producto:</label>
                <input type="text" id="editDescripcion_${prod.codigo}" value="${prod.descripcion || ''}" placeholder="Descripción o detalles">
                
                <label style="color:#aaa; font-size:0.75rem;">Precio Anterior (Tachado):</label>
                <input type="number" id="editPrecioViejo_${prod.codigo}" value="${prod.precioViejo || ''}" placeholder="Sin precio tachado">
                
                <label style="color:#aaa; font-size:0.75rem;">Precio Nuevo (Actual):</label>
                <input type="number" id="editPrecio_${prod.codigo}" value="${prod.precioNuevo}">
                
                <label style="color:#aaa; font-size:0.75rem; margin-top:5px; font-weight:bold;">Cambiar Imagen (Opcional):</label>
                <input type="url" id="editImagenUrl_${prod.codigo}" value="${prod.imagen || ''}" placeholder="Pegar URL directa de la imagen">
                
                <label style="color:#888; font-size:0.7rem;">O seleccionar archivo local:</label>
                <input type="file" id="editImagenFile_${prod.codigo}" accept="image/*">
                
                <div style="display:flex; gap:8px; margin-top:8px;">
                    <button onclick="guardarCambiosProducto('${prod.codigo}')" style="flex:1; background:var(--gold); color:#000; border:none; padding:6px; font-weight:bold; border-radius:4px; cursor:pointer;">
                        <i class="fas fa-save"></i> Guardar
                    </button>
                    <button onclick="eliminarProducto('${prod.codigo}')" style="background:#e74c3c; color:#fff; border:none; padding:6px 12px; font-weight:bold; border-radius:4px; cursor:pointer;">
                        <i class="fas fa-trash-alt"></i> Borrar
                    </button>
                </div>
            </div>
        `;
        listContainer.appendChild(item);
    });
}

function renderizarListaSeccionesAdmin() {
    const ul = document.getElementById("listaSeccionesAdmin");
    if (!ul) return;
    ul.innerHTML = "";

    secciones.forEach(sec => {
        const li = document.createElement("li");
        li.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:#222; padding:8px 12px; margin-bottom:6px; border-radius:4px; color:#fff;";
        li.innerHTML = `
            <span>${sec}</span>
            ${sec !== "Relojes" ? `<button onclick="eliminarSeccion('${sec}')" style="background:#e74c3c; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.75rem;">Borrar</button>` : '<span style="color:#666; font-size:0.75rem;">(Por defecto)</span>'}
        `;
        ul.appendChild(li);
    });
}

// Crear nueva Sección en Firestore
window.crearNuevaSeccion = async function() {
    const input = document.getElementById("nuevaSeccionNombre");
    const nombreSec = input ? input.value.trim() : "";

    if (!nombreSec) {
        alert("Ingresá el nombre de la nueva sección.");
        return;
    }

    if (secciones.includes(nombreSec)) {
        alert("Esa sección ya existe.");
        return;
    }

    try {
        await setDoc(doc(db, "secciones", nombreSec), { nombre: nombreSec });
        secciones.push(nombreSec);
        input.value = "";
        alert(`¡Sección '${nombreSec}' creada con éxito!`);
        renderizarFiltrosCatalogo();
        renderizarPanelAdmin();
    } catch (error) {
        alert("Error al crear la sección: " + error.message);
    }
};

window.eliminarSeccion = async function(nombreSec) {
    if (confirm(`¿Borrar la sección '${nombreSec}'? Los productos asignados quedarán en 'Relojes'.`)) {
        try {
            await deleteDoc(doc(db, "secciones", nombreSec));
            secciones = secciones.filter(s => s !== nombreSec);
            productos.forEach(async p => {
                if (p.seccion === nombreSec) {
                    p.seccion = "Relojes";
                    await updateDoc(doc(db, "productos", p.codigo), { seccion: "Relojes" });
                }
            });
            alert("Sección eliminada.");
            renderizarFiltrosCatalogo();
            renderizarPanelAdmin();
        } catch (error) {
            alert("Error al borrar la sección: " + error.message);
        }
    }
};

window.cerrarSesionAdmin = async function() {
    await signOut(auth);
    alert("Sesión cerrada correctamente.");
    cerrarAdmin();
};

// Agregar Producto (Soporta URL o Archivo y Sección)
window.agregarNuevoProducto = async function() {
    const seccion = document.getElementById("newSeccion").value;
    const codigo = document.getElementById("newCodigo").value.trim();
    const nombre = document.getElementById("newNombre").value.trim();
    const descripcion = document.getElementById("newDescripcion").value.trim();
    const precioViejoInput = document.getElementById("newPrecioViejo").value;
    const precioNuevo = Number(document.getElementById("newPrecio").value);
    const imagenUrlInput = document.getElementById("newImagenUrl").value.trim();
    const fileInput = document.getElementById("newImagenFile");
    const btnGuardar = document.getElementById("btnGuardarNuevo");

    if (!codigo || !nombre || !precioNuevo || (!imagenUrlInput && fileInput.files.length === 0)) {
        alert("Por favor completa el código, nombre, precio nuevo y proveé una URL o archivo de imagen.");
        return;
    }

    try {
        btnGuardar.disabled = true;
        btnGuardar.innerText = "Guardando producto...";

        let finalImageUrl = imagenUrlInput;

        if (!finalImageUrl && fileInput.files.length > 0) {
            btnGuardar.innerText = "Subiendo imagen a Storage...";
            const file = fileInput.files[0];
            const storageRef = ref(storage, `productos/${codigo}_${file.name}`);
            await uploadBytes(storageRef, file);
            finalImageUrl = await getDownloadURL(storageRef);
        }

        const nuevoProducto = {
            seccion,
            codigo,
            nombre,
            descripcion: descripcion || "Producto exclusivo.",
            precioViejo: precioViejoInput ? Number(precioViejoInput) : null,
            precioNuevo: precioNuevo,
            imagen: finalImageUrl
        };

        await setDoc(doc(db, "productos", codigo), nuevoProducto);
        alert(`¡Producto ${nombre} agregado con éxito!`);
        obtenerDatosFirestore();
    } catch (error) {
        alert("Error al agregar el producto: " + error.message);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar en Catálogo';
    }
};

// Guardar Cambios en Producto Existente
window.guardarCambiosProducto = async function(codigo) {
    const nuevaSeccion = document.getElementById(`editSeccion_${codigo}`).value;
    const nuevoNombre = document.getElementById(`editNombre_${codigo}`).value.trim();
    const nuevaDescripcion = document.getElementById(`editDescripcion_${codigo}`).value.trim();
    const precioViejoVal = document.getElementById(`editPrecioViejo_${codigo}`).value;
    const nuevoPrecio = Number(document.getElementById(`editPrecio_${codigo}`).value);
    const imagenUrlVal = document.getElementById(`editImagenUrl_${codigo}`).value.trim();
    const fileInput = document.getElementById(`editImagenFile_${codigo}`);

    if (!nuevoNombre || isNaN(nuevoPrecio)) {
        alert("El nombre y el precio nuevo no pueden estar vacíos.");
        return;
    }

    try {
        let updateData = {
            seccion: nuevaSeccion,
            nombre: nuevoNombre,
            descripcion: nuevaDescripcion,
            precioViejo: precioViejoVal ? Number(precioViejoVal) : null,
            precioNuevo: nuevoPrecio,
            imagen: imagenUrlVal
        };

        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const storageRef = ref(storage, `productos/${codigo}_${file.name}`);
            await uploadBytes(storageRef, file);
            const imageUrl = await getDownloadURL(storageRef);
            updateData.imagen = imageUrl;
        }

        const prodRef = doc(db, "productos", codigo);
        await updateDoc(prodRef, updateData);

        alert(`¡Producto ${codigo} actualizado correctamente!`);
        obtenerDatosFirestore();
    } catch (error) {
        alert("Error al actualizar: " + error.message);
    }
};

// Eliminar Producto
window.eliminarProducto = async function(codigo) {
    if (confirm(`¿Estás seguro de que querés borrar el producto ${codigo}?`)) {
        try {
            await deleteDoc(doc(db, "productos", codigo));
            alert("Producto eliminado de Firestore.");
            obtenerDatosFirestore();
        } catch (error) {
            alert("Error al borrar el producto: " + error.message);
        }
    }
};

// ==========================================================================
// 7. EVENTOS Y AUTENTICACIÓN
// ==========================================================================
function configurarEventos() {
    document.getElementById("btnVerColeccion")?.addEventListener("click", () => {
        document.getElementById("productosContainer")?.scrollIntoView({ behavior: "smooth" });
    });

    document.getElementById("openCartBtn")?.addEventListener("click", abrirCarrito);
    document.getElementById("closeCart")?.addEventListener("click", cerrarCarrito);
    document.getElementById("cartOverlay")?.addEventListener("click", cerrarCarrito);
    document.getElementById("btnWhatsAppCheckout")?.addEventListener("click", enviarPedidoWhatsApp);

    document.getElementById("btnAdminAccess")?.addEventListener("click", abrirAdmin);
    document.getElementById("closeAdmin")?.addEventListener("click", cerrarAdmin);
    document.getElementById("adminOverlay")?.addEventListener("click", cerrarAdmin);

    document.getElementById("btnLogin")?.addEventListener("click", async () => {
        const email = document.getElementById("adminEmail")?.value;
        const pass = document.getElementById("adminPass")?.value;

        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (error) {
            alert("Credenciales incorrectas: " + error.message);
        }
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById("adminLoginView")?.classList.add("hidden");
            document.getElementById("adminPanelVCew")?.classList.remove("hidden");
            renderizarPanelAdmin();
        } else {
            document.getElementById("adminPanelVCew")?.classList.add("hidden");
            document.getElementById("adminLoginView")?.classList.remove("hidden");
        }
    });
}

function abrirCarrito() {
    document.getElementById("cartModal")?.classList.add("active");
    document.body.classList.add("modal-open");
}

function cerrarCarrito() {
    document.getElementById("cartModal")?.classList.remove("active");
    document.body.classList.remove("modal-open");
}

function abrirAdmin() {
    document.getElementById("adminModal")?.classList.add("active");
    document.body.classList.add("modal-open");
}

function cerrarAdmin() {
    document.getElementById("adminModal")?.classList.remove("active");
    document.body.classList.remove("modal-open");
}
