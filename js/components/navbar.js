function renderNavbar() {
    const navbar = document.getElementById('navbar');
    const mobileMenu = document.getElementById('mobileMenu');

    navbar.innerHTML = `
        <a class="nav-logo" onclick="navigate('home')" title="Home">🏷️</a>

        <ul class="nav-links nav-links-main">
            <li class="nav-item">
                <a href="#" class="nav-dropdown-trigger">Rileva ▾</a>
                <div class="dropdown">
                    <div class="dropdown-inner">
                        <a onclick="navigate('rileva-manuale')">✏️ Manuale</a>
                        <a onclick="navigate('rileva-foto')">📷 Foto</a>
                    </div>
                </div>
            </li>
            <li><a onclick="navigate('controlla')">Controlla</a></li>
            <li><a onclick="navigate('analizza')">Analizza</a></li>
            <li><a onclick="navigate('spesa')" title="Lista spesa">🛒</a></li>
            <li class="nav-item">
                <a href="#" class="nav-dropdown-trigger">··· ▾</a>
                <div class="dropdown dropdown-right">
                    <div class="dropdown-inner">
                        <a onclick="navigate('manutenzione')">🔧 Manutenzione</a>
                        <a onclick="logout()">🚪 Esci</a>
                    </div>
                </div>
            </li>
        </ul>
    `;
    /*
       <!-- Mobile: hamburger solo per il sottomenu ··· -->
        <button class="hamburger" id="hamburger" aria-label="Menu">
            <span></span><span></span><span></span>
        </button>
        mobileMenu.innerHTML = `
            <a onclick="navigate('home');          chiudiMenu()">🏠 Home</a>
            <a onclick="navigate('manutenzione');  chiudiMenu()">🔧 Manutenzione</a>
            <button onclick="logout()">🚪 Esci</button>
        `;
    
        document.getElementById('hamburger').addEventListener('click', () => {
            mobileMenu.classList.toggle('open');
        });
    }
    
    function chiudiMenu() {
        document.getElementById('mobileMenu').classList.remove('open');*/
}