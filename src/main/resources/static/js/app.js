const app = {
    stompClient: null,
    documentId: 0,
    subscription: null,
    lastContent: "",
    pendingSubscribe: null,
    isConnected: false,
    clientId: Math.random().toString(36).substring(7),

    // Retorna o token salvo no sessionStorage
    getToken() {
        return sessionStorage.getItem("token");
    },

    // Monta o header Authorization para as requisições
    authHeader() {
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.getToken()}`
        };
    },

    // === AUTENTICAÇÃO ===

    async login() {
        const username = document.getElementById("loginUsername").value.trim();
        const password = document.getElementById("loginPassword").value;

        if (!username || !password) {
            alert("Preencha usuário e senha.");
            return;
        }

        this.setLoading(true);
        try {
            const response = await fetch("/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) throw new Error("Usuário ou senha inválidos.");

            const data = await response.json();
            sessionStorage.setItem("token", data.token);

            this.mostrarHome();
            this.buscarDocumentos();
            this.connect();

        } catch (e) {
            alert(e.message);
        } finally {
            this.setLoading(false);
        }
    },

    async registrar() {
        const username = document.getElementById("registerUsername").value.trim();
        const password = document.getElementById("registerPassword").value;

        if (!username || !password) {
            alert("Preencha usuário e senha.");
            return;
        }

        this.setLoading(true);
        try {
            const response = await fetch("/auth/registrar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) throw new Error("Erro ao criar conta. Tente outro usuário.");

            const data = await response.json();
            sessionStorage.setItem("token", data.token);

            this.mostrarHome();
            this.buscarDocumentos();
            this.connect();

        } catch (e) {
            alert(e.message);
        } finally {
            this.setLoading(false);
        }
    },

    logout() {
        sessionStorage.removeItem("token");
        if (this.stompClient) this.stompClient.disconnect();
        this.isConnected = false;
        this.mostrarLogin();
    },

    // === NAVEGAÇÃO ENTRE TELAS ===

    mostrarLogin() {
        document.getElementById("loginScreen").classList.remove("hidden");
        document.getElementById("registerScreen").classList.add("hidden");
        document.getElementById("home").classList.add("hidden");
    },

    mostrarRegistro() {
        document.getElementById("registerScreen").classList.remove("hidden");
        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("home").classList.add("hidden");
    },

    mostrarHome() {
        document.getElementById("home").classList.remove("hidden");
        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("registerScreen").classList.add("hidden");
    },

    // === WEBSOCKET ===

    connect() {
        const socket = new SockJS("/ws");
        this.stompClient = Stomp.over(socket);
        this.stompClient.debug = null;

        this.stompClient.connect(
            {},
            () => {
                console.log("Conectado ao servidor!");
                this.isConnected = true;
                if (this.pendingSubscribe !== null) {
                    this.subscribe(this.pendingSubscribe);
                    this.pendingSubscribe = null;
                }
            },
            (error) => {
                console.error("Erro na conexão:", error);
                this.isConnected = false;
                setTimeout(() => this.connect(), 3000);
            }
        );
    },

    subscribe(documentId) {
        if (!this.isConnected) {
            this.pendingSubscribe = documentId;
            return;
        }
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
        this.subscription = this.stompClient.subscribe(
            `/topic/document/${documentId}`,
            (message) => {
                const data = JSON.parse(message.body);
                if (data.senderId === this.clientId) return;
                if (data.documentId.toString() !== this.documentId.toString()) return;
                this.renderMessage(data.content);
            }
        );
    },

    // === DOCUMENTOS ===

    abrirModal() {
        const input = document.getElementById("inputNome");
        input.value = "";
        document.getElementById("modalNome").classList.remove("hidden");
        input.focus();
    },

    fecharModal() {
        document.getElementById("modalNome").classList.add("hidden");
    },

    setLoading(visible) {
        document.getElementById("loadingOverlay").classList.toggle("hidden", !visible);
    },

    async buscarDocumentos() {
        try {
            const response = await fetch("/documents", {
                headers: this.authHeader()
            });

            if (response.status === 401) {
                this.logout();
                return;
            }

            if (!response.ok) throw new Error("Erro ao carregar documentos.");

            const data = await response.json();
            this.documentos = data;
            this.renderLista(data);

        } catch (error) {
            console.error("Erro ao carregar documentos:", error);
            alert(error.message || "Erro inesperado");
        }
    },

    renderLista(lista) {
        const container = document.getElementById("listaDocumentos");
        container.innerHTML = "";

        if (lista.length === 0) {
            container.innerHTML = `<p style="color: rgba(255,255,255,0.6); margin-top: 10px;">Nenhum documento encontrado.</p>`;
            return;
        }

        lista.forEach(doc => {
            const div = document.createElement("div");
            div.classList.add("doc-item");
            const p = document.createElement("p");
            p.textContent = doc.name || `Documento ${doc.id}`;
            div.appendChild(p);
            div.addEventListener("click", () => this.abrirDocumento(doc.id));
            container.appendChild(div);
        });
    },

    filtrarDocumentos() {
        const texto = document.getElementById("docInput").value.toLowerCase();
        const filtrados = this.documentos.filter(doc =>
            doc.id.toString().includes(texto) ||
            (doc.name && doc.name.toLowerCase().includes(texto))
        );
        this.renderLista(filtrados);
    },

    async abrirDocumento(id) {
        this.documentId = id;
        this.setLoading(true);

        try {
            const response = await fetch(`/documents/${id}`, {
                headers: this.authHeader()
            });

            if (response.status === 401) { this.logout(); return; }
            if (!response.ok) throw new Error(`Erro ao buscar documento: ${response.status}`);

            const doc = await response.json();

            document.getElementById("editor").innerText = "";
            document.getElementById("home").classList.add("hidden");
            document.getElementById("editorPage").classList.remove("hidden");

            this.documentoAtual = doc;
            this.lastContent = doc.content || "";
            this.renderMessage(doc.content || "");
            this.subscribe(id);

        } catch (e) {
            console.error("Erro ao carregar documento", e);
            this.pendingSubscribe = null;
            this.documentId = 0;
            this.setLoading(false);
            alert("Não foi possível carregar o documento.");
            this.voltar();
        } finally {
            this.setLoading(false);
        }
    },

    voltar() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
        this.documentoAtual = null;
        this.documentId = 0;
        document.getElementById("home").classList.remove("hidden");
        document.getElementById("editorPage").classList.add("hidden");
    },

    renderMessage(content) {
        const editor = document.getElementById("editor");
        if (editor.innerText === content) return;

        const selection = window.getSelection();
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        const offset = range ? range.startOffset : 0;

        editor.innerText = content;
        this.lastContent = content;

        if (range) {
            const newRange = document.createRange();
            const textNode = editor.firstChild || editor;
            try {
                const newOffset = Math.min(offset, textNode.length || 0);
                newRange.setStart(textNode, newOffset);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            } catch (e) {
                console.warn("Não foi possível restaurar o cursor", e);
            }
        }
    },

    async confirmarNome() {
        const nome = document.getElementById("inputNome").value.trim();
        if (!nome) { alert("Nome inválido!"); return; }

        this.setLoading(true);
        try {
            const response = await fetch("/documents/criarDocumento", {
                method: "POST",
                headers: this.authHeader(),
                body: JSON.stringify({ name: nome })
            });

            if (response.status === 401) { this.logout(); return; }
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

            const docSalvo = await response.json();
            this.documentId = docSalvo.id;
            this.documentoAtual = docSalvo;
            this.lastContent = "";

            const editor = document.getElementById("editor");
            editor.innerHTML = "";
            document.getElementById("home").classList.add("hidden");
            document.getElementById("editorPage").classList.remove("hidden");
            this.fecharModal();
            editor.focus();
            this.subscribe(this.documentId);

        } catch (error) {
            console.error("Erro ao criar documento:", error);
            alert("Não foi possível criar o documento.");
        } finally {
            this.setLoading(false);
        }
    },

    // === EVENTOS ===

    bindEvents() {
        const editor = document.getElementById("editor");
        const input = document.getElementById("inputNome");
        const modal = document.getElementById("modalNome");

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") this.confirmarNome();
        });

        document.getElementById("loginUsername").addEventListener("keydown", (e) => {
            if (e.key === "Enter") this.login();
        });

        document.getElementById("loginPassword").addEventListener("keydown", (e) => {
            if (e.key === "Enter") this.login();
        });

        modal.addEventListener("click", (e) => {
            if (e.target === modal) this.fecharModal();
        });

        modal.addEventListener("keydown", (e) => {
            if (e.key !== "Tab") return;
            const focusable = modal.querySelectorAll("input, button");
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
                e.preventDefault();
                (e.shiftKey ? last : first).focus();
            }
        });

        let timeout;
        editor.addEventListener("input", () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                if (!this.stompClient || !this.stompClient.connected) return;
                if (!this.documentoAtual) return;
                const content = editor.innerText;
                if (content === this.lastContent) return;
                this.lastContent = content;
                this.stompClient.send("/app/edit", {}, JSON.stringify({
                    documentId: this.documentId,
                    content: content,
                    senderId: this.clientId
                }));
            }, 300);
        });
    },

    init() {
        this.bindEvents();
        // Se já tem token salvo, vai direto para a home
        if (this.getToken()) {
            this.mostrarHome();
            this.buscarDocumentos();
            this.connect();
        } else {
            this.mostrarLogin();
        }
    }
};

window.app = app;
app.init();