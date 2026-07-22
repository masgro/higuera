const STORAGE_KEY = "higuera-cultural-menu";
const ADMIN_SESSION_KEY = "higuera-cultural-admin-auth";
const ADMIN_PASSWORD_HASH = "6ec444624008455836fcb006a607431fbb7a9ae324849eed063a32e341b4534b";

const defaultMenu = [
  {
    id: "empanadas-saltenas",
    name: "Empanadas salteñas",
    category: "Entradas",
    price: 5200,
    description: "Carne cortada a cuchillo, papa, huevo, verdeo y masa casera al horno."
  },
  {
    id: "provoleta",
    name: "Provoleta con chimichurri",
    category: "Entradas",
    price: 6100,
    description: "Queso dorado a la plancha, oliva, orégano y pan de campo."
  },
  {
    id: "locro-criollo",
    name: "Locro criollo",
    category: "Principales",
    price: 9800,
    description: "Maíz blanco, porotos, zapallo, cortes de cerdo y salsa picante aparte."
  },
  {
    id: "milanesa-napolitana",
    name: "Milanesa napolitana",
    category: "Principales",
    price: 11200,
    description: "Ternera rebozada, tomate, jamón, muzzarella y papas rústicas."
  },
  {
    id: "humita-cazuela",
    name: "Humita en cazuela",
    category: "Principales",
    price: 8900,
    description: "Choclo rallado, calabaza, queso criollo y albahaca fresca."
  },
  {
    id: "flan-mixto",
    name: "Flan mixto",
    category: "Postres",
    price: 4300,
    description: "Flan casero con dulce de leche y crema batida."
  },
  {
    id: "panqueques",
    name: "Panqueques con dulce de leche",
    category: "Postres",
    price: 4800,
    description: "Masa fina, dulce de leche repostero y azúcar quemada."
  },
  {
    id: "vino-casa",
    name: "Vino de la casa",
    category: "Bebidas",
    price: 3900,
    description: "Copa de tinto joven seleccionado para acompañar platos regionales."
  }
];

function getMenu() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return normalizeMenu(defaultMenu);

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? normalizeMenu(parsed) : normalizeMenu(defaultMenu);
  } catch {
    return normalizeMenu(defaultMenu);
  }
}

function saveMenu(menu) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(menu));
}

function normalizeMenu(menu) {
  return menu.map((item) => ({
    ...item,
    enabled: item.enabled !== false
  }));
}

function formatPrice(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(value);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[character];
  });
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function sha256(value) {
  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    throw new Error("Web Crypto no está disponible en este navegador.");
  }

  const encoded = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

function renderMenu(filter = "Todos") {
  const list = document.querySelector("#menu-list");
  const empty = document.querySelector("#empty-menu");
  if (!list || !empty) return;

  const menu = getMenu().filter((item) => item.enabled);
  const filtered = filter === "Todos" ? menu : menu.filter((item) => item.category === filter);

  list.innerHTML = filtered
    .map(
      (item) => `
        <article class="menu-card">
          <div>
            <span class="menu-category">${escapeHtml(item.category)}</span>
            <h2>${escapeHtml(item.name)}</h2>
            <p>${escapeHtml(item.description)}</p>
          </div>
          <strong>${formatPrice(Number(item.price))}</strong>
        </article>
      `
    )
    .join("");

  empty.hidden = filtered.length > 0;
}

function setupMenuPage() {
  const filters = [...document.querySelectorAll("[data-filter]")];
  renderMenu();

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      filters.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderMenu(button.dataset.filter);
    });
  });
}

function renderAdminList() {
  const tbody = document.querySelector("#admin-list");
  const count = document.querySelector("#admin-count");
  if (!tbody || !count) return;

  const menu = getMenu();
  count.textContent = `${menu.length} platos`;
  tbody.innerHTML = menu
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(item.description)}</span>
          </td>
          <td>${escapeHtml(item.category)}</td>
          <td>${formatPrice(Number(item.price))}</td>
          <td>
            <span class="status-pill ${item.enabled ? "enabled" : "disabled"}">
              ${item.enabled ? "Habilitado" : "Deshabilitado"}
            </span>
          </td>
          <td>
            <button class="table-action" type="button" data-toggle="${escapeHtml(item.id)}">
              ${item.enabled ? "Deshabilitar" : "Habilitar"}
            </button>
            <button class="table-action" type="button" data-edit="${escapeHtml(item.id)}">Editar</button>
            <button class="table-action danger-text" type="button" data-delete="${escapeHtml(item.id)}">Eliminar</button>
          </td>
        </tr>
      `
    )
    .join("");
}

function clearForm() {
  document.querySelector("#item-id").value = "";
  document.querySelector("#menu-form").reset();
  document.querySelector("#item-enabled").checked = true;
}

function setupAdminPage() {
  if (sessionStorage.getItem(ADMIN_SESSION_KEY) !== "true") {
    window.location.href = "login.html";
    return;
  }

  setupAdminControls();
}

function setupLoginPage() {
  if (sessionStorage.getItem(ADMIN_SESSION_KEY) === "true") {
    window.location.href = "admin.html";
    return;
  }

  const loginForm = document.querySelector("#login-form");
  const passwordInput = document.querySelector("#admin-password");
  const error = document.querySelector("#login-error");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    let isValid = false;

    try {
      const passwordHash = await sha256(passwordInput.value);
      isValid = passwordHash === ADMIN_PASSWORD_HASH;
    } catch {
      error.textContent = "Este navegador no permite validar la contraseña.";
      error.hidden = false;
      return;
    }

    if (!isValid) {
      error.textContent = "Contraseña incorrecta.";
      error.hidden = false;
      passwordInput.value = "";
      passwordInput.focus();
      return;
    }

    sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
    window.location.href = "admin.html";
  });
}

function setupAdminControls() {
  const form = document.querySelector("#menu-form");
  const cancel = document.querySelector("#cancel-edit");
  const reset = document.querySelector("#reset-menu");
  const logout = document.querySelector("#logout-admin");
  const tbody = document.querySelector("#admin-list");

  renderAdminList();

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const id = document.querySelector("#item-id").value;
    const name = document.querySelector("#item-name").value.trim();
    const category = document.querySelector("#item-category").value;
    const price = Number(document.querySelector("#item-price").value);
    const description = document.querySelector("#item-description").value.trim();
    const enabled = document.querySelector("#item-enabled").checked;
    const menu = getMenu();
    const nextItem = {
      id: id || `${slugify(name)}-${Date.now()}`,
      name,
      category,
      price,
      description,
      enabled
    };

    const nextMenu = id
      ? menu.map((item) => (item.id === id ? nextItem : item))
      : [...menu, nextItem];

    saveMenu(nextMenu);
    clearForm();
    renderAdminList();
  });

  tbody.addEventListener("click", (event) => {
    const toggleId = event.target.dataset.toggle;
    const editId = event.target.dataset.edit;
    const deleteId = event.target.dataset.delete;
    const menu = getMenu();

    if (toggleId) {
      saveMenu(
        menu.map((item) => (item.id === toggleId ? { ...item, enabled: !item.enabled } : item))
      );
      renderAdminList();
      clearForm();
    }

    if (editId) {
      const item = menu.find((entry) => entry.id === editId);
      if (!item) return;

      document.querySelector("#item-id").value = item.id;
      document.querySelector("#item-name").value = item.name;
      document.querySelector("#item-category").value = item.category;
      document.querySelector("#item-price").value = item.price;
      document.querySelector("#item-description").value = item.description;
      document.querySelector("#item-enabled").checked = item.enabled;
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (deleteId) {
      saveMenu(menu.filter((item) => item.id !== deleteId));
      renderAdminList();
      clearForm();
    }
  });

  cancel.addEventListener("click", clearForm);

  reset.addEventListener("click", () => {
    saveMenu(normalizeMenu(defaultMenu));
    clearForm();
    renderAdminList();
  });

  logout.addEventListener("click", () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    window.location.href = "login.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  registerServiceWorker();
  if (page === "menu") setupMenuPage();
  if (page === "login") setupLoginPage();
  if (page === "admin") setupAdminPage();
});
