// ============================================================
// NAVBAR.JS — genera la navbar una volta sola
// Per aggiungere/modificare voci di menu: modifica solo qui
// ============================================================

function renderNavbar() {
    const navbar = document.getElementById('navbar');
    const mobileMenu = document.getElementById('mobileMenu');

    navbar.innerHTML = `
        <a class="nav-logo" onclick="navigate('home')">
            <span class="accent">Home</span>
        </a>
        <ul class="nav-links">
            <li class="nav-item">
                <a href="#" id="navRileva">Rileva ▾</a>
                <div class="dropdown">
                    <div class="dropdown-inner">
                        <a onclick="navigate('rileva-manuale')">✏️ Manuale</a>
                        <a onclick="navigate('rileva-foto')">📷 Foto</a>
                    </div>
                </div>
            </li>
            <li><a onclick="navigate('controlla')" id="navControlla">Controlla</a></li>
            <li><a onclick="navigate('analizza')"  id="navAnalizza">Analizza</a></li>
            <li><button onclick="logout()">Esci</button></li>
        </ul>
        <button class="hamburger" id="hamburger" aria-label="Menu">
            <span></span><span></span><span></span>
        </button>
    `;

    mobileMenu.innerHTML = `
        <div class="sub-label">Rileva</div>
        <a onclick="navigate('rileva-manuale'); chiudiMenu()">✏️ Manuale</a>
        <a onclick="navigate('rileva-foto');    chiudiMenu()">📷 Foto</a>
        <a onclick="navigate('controlla');      chiudiMenu()">🔍 Controlla</a>
        <a onclick="navigate('analizza');       chiudiMenu()">📊 Analizza</a>
        <button onclick="logout()">🚪 Esci</button>
    `;

    document.getElementById('hamburger').addEventListener('click', () => {
        mobileMenu.classList.toggle('open');
    });
}

function chiudiMenu() {
    document.getElementById('mobileMenu').classList.remove('open');
}
