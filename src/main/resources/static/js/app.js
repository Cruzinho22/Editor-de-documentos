const app = {
    stompClient: null,
    documentId: 0,
    subscription: null,

    clientId: Math.random().toString(36).substring(7),

    connect() {
        const socket = new SockJS("http://localhost:8080/ws");
        this.stompClient = Stomp.over(socket);

        this.stompClient.connect(
            {},
            () => {
                console.log("Conectado ao servidor!");
                this.subscribe(this.documentId);
            },
            (error) => {
                console.error("Erro na conexão:", error);
            }
        );
    },

    criarDocumento() {
        this.documentId++;
        document.getElementById("home").classList.add("hidden");
        document.getElementById("editorPage").classList.remove("hidden");
    },

    // buscarDocumento(){

    //     this.stompClient.

    //     const input = document.getElementById("docInput");

    // },

    voltar() {
        document.getElementById("home").classList.remove("hidden");
        document.getElementById("editorPage").classList.add("hidden");
    },

    subscribe(documentId) {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
        this.subscription = this.stompClient.subscribe(
            `/topic/document/${documentId}`,
            (message) => {
                const data = JSON.parse(message.body);
                if (data.senderId === this.clientId) return;
                this.renderMessage(data.content);
            }
        );
    },

    renderMessage(content) {
        const editor = document.getElementById("editor");
        editor.innerHTML = content;
    },

    bindEvents() {
        const editor = document.getElementById("editor");

        this.connect();

        let timeout;

        editor.addEventListener("input", () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                if (!this.stompClient || !this.stompClient.connected) return;
                const content = editor.innerHTML;
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
    }
};

window.app = app;
app.init();