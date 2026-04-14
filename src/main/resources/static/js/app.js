const app = {
    stompClient: null,
    documentId: 0,
    subscription: null,
    lastContent: "",
    pendingSubscribe: null,

    clientId: Math.random().toString(36).substring(7),

connect() {
    const socket = new SockJS("http://localhost:8080/ws");
    this.stompClient = Stomp.over(socket);

    this.stompClient.connect(
        {},
        () => {
            console.log("Conectado ao servidor!");
            this.isConnected = true;

            // Se tiver subscribe pendente, executa
            if (this.pendingSubscribe !== null) {
                this.subscribe(this.pendingSubscribe);
                this.pendingSubscribe = null;
            }
        },
        (error) => {
            console.error("Erro na conexão:", error);
        }
    );
},

subscribe(documentId) {
    if (!this.isConnected) {
        console.warn("Conexão ainda não pronta, aguardando...");
        this.pendingSubscribe = documentId;
        return;
    }

    if (this.subscription) {
        this.subscription.unsubscribe();
    }

    this.subscription = this.stompClient.subscribe(
        `/topic/document/${documentId}`,
        (message) => {
            const data = JSON.parse(message.body);

            // 1. Ignora se for eu mesmo
            if (data.senderId === this.clientId) return;
            
            // 2. Ignora se a mensagem for de um documento que não estou mais editando
            if (data.documentId.toString() !== this.documentId.toString()) return;

            this.renderMessage(data.content);
        }
    );
},

abrirModal() {
    const input = document.getElementById("inputNome");
    input.value = "";
    document.getElementById("modalNome").classList.remove("hidden");
    input.focus();
},

fecharModal() {
    document.getElementById("modalNome").classList.add("hidden");
},


    async buscarDocumentos() {

        try {
            const response = await fetch("http://localhost:8080/documents");

            if (!response.ok) {
                throw new Error("Erro na requisição");
            }

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

        lista.forEach(doc => {
            const div = document.createElement("div");
            div.style.cursor = "pointer";
            div.style.padding = "10px";
            div.style.borderBottom = "1px solid #ccc";

            const p = document.createElement("p");
            p.textContent = doc.name || `Documento ${doc.id}`;

            div.appendChild(p);

            div.addEventListener("click", () => {
                this.abrirDocumento(doc.id);
            });

            container.appendChild(div);
        });
    },

    filtrarDocumentos() {
        const texto = document.getElementById("docInput").value.toLowerCase();

        const filtrados = this.documentos.filter(doc =>
        doc.id.toString().includes(texto) ||
        (doc.nome && doc.nome.toLowerCase().includes(texto))
    );

        this.renderLista(filtrados);
    },
    
  async abrirDocumento(id) {
        this.documentId = id;

        document.getElementById("home").classList.add("hidden");
        document.getElementById("editorPage").classList.remove("hidden");

        try {
            const response = await fetch(`http://localhost:8080/documents/${id}`);
            const doc = await response.json();

            this.documentoAtual = doc; 

            this.lastContent = doc.content || "";

            this.renderMessage(doc.content || "");
        } catch (e) {
            console.error("Erro ao carregar documento", e);
        }

        this.subscribe(id);
    },

    voltar() {
        document.getElementById("home").classList.remove("hidden");
        document.getElementById("editorPage").classList.add("hidden");
    },

renderMessage(content) {
    const editor = document.getElementById("editor");
    
    // Se o conteúdo for idêntico ao que já está lá, não faz nada
    if (editor.innerText === content) return;

    // Salva a posição do cursor antes de atualizar
    const selection = window.getSelection();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const offset = range ? range.startOffset : 0;

    editor.innerText = content;
    this.lastContent = content;

    // Tenta restaurar a posição do cursor (ajuste básico)
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
    const nome = document.getElementById("inputNome").value;
    if (!nome || !nome.trim()) {
        alert("Nome inválido!");
        return;
    }

    try {
        const response = await fetch("http://localhost:8080/documents/criarDocumento", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: nome }) 
        });

        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

        const docSalvo = await response.json(); 
        
        // --- Atualiza o estado com dados REAIS do banco ---
        this.documentId = docSalvo.id; 
        this.documentoAtual = docSalvo;
        this.lastContent = ""; 
        
        // --- Prepara a UI ---
        const editor = document.getElementById("editor");
        editor.innerHTML = "";
        
        document.getElementById("home").classList.add("hidden");
        document.getElementById("editorPage").classList.remove("hidden");
        this.fecharModal();
        editor.focus();

        // --- Subscreve no tópico correto ---
        this.subscribe(this.documentId); 

        console.log("Documento criado com ID:", this.documentId);

    } catch (error) {
        console.error("Erro ao criar documento:", error);
        alert("Não foi possível criar o documento.");
    }
},

bindEvents() {
    const editor = document.getElementById("editor");
    const input = document.getElementById("inputNome");
    const modal = document.getElementById("modalNome");

    this.connect();

    // Enter no input
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            this.confirmarNome();
        }
    });

    // Fechar modal clicando fora
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            this.fecharModal();
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
        }, 100);
    });
},

    init() {
        this.bindEvents();
        this.buscarDocumentos();
    }
};

window.app = app;
app.init();