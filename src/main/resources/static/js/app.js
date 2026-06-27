const app = {
    // Cliente STOMP para comunicação WebSocket
    stompClient: null,
    // ID do documento atualmente aberto
    documentId: 0,
    // Referência à subscription ativa no tópico do documento
    subscription: null,
    // Último conteúdo conhecido do editor (evita envios desnecessários)
    lastContent: "",
    // ID de documento pendente, caso a conexão ainda não esteja pronta
    pendingSubscribe: null,

    // ID único deste cliente, usado para ignorar as próprias mensagens recebidas via WebSocket
    clientId: Math.random().toString(36).substring(7),

    // Inicia a conexão WebSocket com o servidor via SockJS + STOMP
    connect() {
        const socket = new SockJS("/ws");
        this.stompClient = Stomp.over(socket);

        this.stompClient.connect(
            {},
            () => {
                console.log("Conectado ao servidor!");
                this.isConnected = true;

                // Se havia um subscribe aguardando a conexão, executa agora
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

    // Inscreve o cliente no tópico STOMP do documento para receber atualizações em tempo real
    subscribe(documentId) {
        // Conexão ainda não estabelecida: guarda o ID para executar depois
        if (!this.isConnected) {
            console.warn("Conexão ainda não pronta, aguardando...");
            this.pendingSubscribe = documentId;
            return;
        }

        // Cancela subscription anterior, se existir
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

    // Abre o modal de criação de documento e limpa o campo de nome
    abrirModal() {
        const input = document.getElementById("inputNome");
        input.value = "";
        document.getElementById("modalNome").classList.remove("hidden");
        input.focus();
    },

    // Fecha o modal de criação sem fazer nada
    fecharModal() {
        document.getElementById("modalNome").classList.add("hidden");
    },

    // Busca a lista de documentos existentes na API
    async buscarDocumentos() {
        try {
            const response = await fetch("/documents");

            if (!response.ok) {
                throw new Error("Erro na requisição");
            }

            const data = await response.json();

            // Armazena localmente para uso no filtro de busca
            this.documentos = data;
            this.renderLista(data);

        } catch (error) {
            console.error("Erro ao carregar documentos:", error);
            alert(error.message || "Erro inesperado");
        }
    },

    // Renderiza a lista de documentos na tela inicial
    renderLista(lista) {
        const container = document.getElementById("listaDocumentos");
        container.innerHTML = "";

        lista.forEach(doc => {
            const div = document.createElement("div");
            div.style.cursor = "pointer";
            div.style.padding = "10px";
            div.style.borderBottom = "1px solid #ccc";

            const p = document.createElement("p");
            // Usa o nome do documento ou um fallback com o ID
            p.textContent = doc.name || `Documento ${doc.id}`;

            div.appendChild(p);

            // Clique no item abre o documento correspondente
            div.addEventListener("click", () => {
                this.abrirDocumento(doc.id);
            });

            container.appendChild(div);
        });
    },

    // Filtra os documentos exibidos com base no texto digitado na busca
    filtrarDocumentos() {
        const texto = document.getElementById("docInput").value.toLowerCase();

        const filtrados = this.documentos.filter(doc =>
            doc.id.toString().includes(texto) ||
            (doc.nome && doc.nome.toLowerCase().includes(texto))
        );

        this.renderLista(filtrados);
    },

    // Carrega um documento pelo ID, exibe o editor e se inscreve no tópico WebSocket
    async abrirDocumento(id) {
        this.documentId = id;

        // Troca a tela inicial pela página do editor
        document.getElementById("home").classList.add("hidden");
        document.getElementById("editorPage").classList.remove("hidden");

        try {
            const response = await fetch(`/documents/${id}`);
            const doc = await response.json();

            this.documentoAtual = doc;

            // Inicializa o lastContent para evitar envio imediato após abertura
            this.lastContent = doc.content || "";

            this.renderMessage(doc.content || "");
        } catch (e) {
            console.error("Erro ao carregar documento", e);
        }

        // Começa a ouvir atualizações em tempo real deste documento
        this.subscribe(id);
    },

    // Retorna para a tela inicial sem salvar (o envio já acontece em tempo real)
    voltar() {
        document.getElementById("home").classList.remove("hidden");
        document.getElementById("editorPage").classList.add("hidden");
    },

    // Atualiza o conteúdo do editor sem sobrescrever a posição do cursor desnecessariamente
    renderMessage(content) {
        const editor = document.getElementById("editor");

        // Conteúdo idêntico: nenhuma atualização necessária
        if (editor.innerText === content) return;

        // Salva a posição do cursor antes de atualizar o conteúdo
        const selection = window.getSelection();
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        const offset = range ? range.startOffset : 0;

        editor.innerText = content;
        this.lastContent = content;

        // Tenta restaurar a posição do cursor após a atualização
        if (range) {
            const newRange = document.createRange();
            const textNode = editor.firstChild || editor;
            try {
                // Garante que o offset não ultrapasse o tamanho do nó de texto
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

    // Valida o nome, chama a API para criar o documento e abre o editor
    async confirmarNome() {
        const nome = document.getElementById("inputNome").value;
        if (!nome || !nome.trim()) {
            alert("Nome inválido!");
            return;
        }

        try {
            const response = await fetch("/documents/criarDocumento", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: nome })
            });

            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

            const docSalvo = await response.json();

            // Atualiza o estado com os dados reais retornados pelo banco
            this.documentId = docSalvo.id;
            this.documentoAtual = docSalvo;
            this.lastContent = "";

            // Prepara o editor: limpa conteúdo e exibe a página
            const editor = document.getElementById("editor");
            editor.innerHTML = "";

            document.getElementById("home").classList.add("hidden");
            document.getElementById("editorPage").classList.remove("hidden");
            this.fecharModal();
            editor.focus();

            // Inscreve no tópico WebSocket do novo documento
            this.subscribe(this.documentId);

            console.log("Documento criado com ID:", this.documentId);

        } catch (error) {
            console.error("Erro ao criar documento:", error);
            alert("Não foi possível criar o documento.");
        }
    },

    // Registra todos os event listeners e inicia a conexão WebSocket
    bindEvents() {
        const editor = document.getElementById("editor");
        const input = document.getElementById("inputNome");
        const modal = document.getElementById("modalNome");

        this.connect();

        // Enter no input do modal confirma a criação do documento
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                this.confirmarNome();
            }
        });

        // Clique fora do modal (no overlay) fecha o modal
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                this.fecharModal();
            }
        });

        let timeout;

        // Envia o conteúdo ao servidor com debounce de 100ms após cada digitação
        editor.addEventListener("input", () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                // Aborta se não houver conexão ativa ou documento aberto
                if (!this.stompClient || !this.stompClient.connected) return;
                if (!this.documentoAtual) return;

                const content = editor.innerText;

                // Não envia se o conteúdo não mudou desde o último envio
                if (content === this.lastContent) return;
                this.lastContent = content;

                // Envia a atualização via STOMP com ID do documento, conteúdo e ID do remetente
                this.stompClient.send("/app/edit", {}, JSON.stringify({
                    documentId: this.documentId,
                    content: content,
                    senderId: this.clientId
                }));
            }, 100);
        });
    },

    // Ponto de entrada: inicializa eventos e carrega os documentos existentes
    init() {
        this.bindEvents();
        this.buscarDocumentos();
    }
};

// Expõe o app globalmente (necessário para os handlers onclick no HTML)
window.app = app;
app.init();