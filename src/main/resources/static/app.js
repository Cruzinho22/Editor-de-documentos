const app = {
    stompClient: null,

    connect() {
        const socket = new SockJS("http://localhost:8080/ws");
        this.stompClient = Stomp.over(socket);

        this.stompClient.connect(
            {},
            () => {
                console.log("✅ Conectado ao servidor!");
                this.subscribe();
            },
            (error) => {
                console.error("❌ Erro na conexão:", error);
                alert("Erro ao conectar no servidor");
            }
        );
    },

    subscribe() {
        this.stompClient.subscribe("/topic/document", (message) => {
            try {
                const data = JSON.parse(message.body);
                this.renderMessage(data.content);
            } catch (e) {
                console.warn("Mensagem não é JSON:", message.body);
                this.renderMessage(message.body);
            }
        });
    },

    send() {
        if (!this.stompClient || !this.stompClient.connected) {
            alert("⚠️ Não conectado ao servidor!");
            return;
        }

        const input = document.getElementById("msg");
        const msg = input.value.trim();

        if (msg === "") return;

        this.stompClient.send("/app/edit", {}, JSON.stringify({
            documentId: "1",
            content: msg
        }));

        input.value = "";
    },

    renderMessage(msg) {
        const li = document.createElement("li");
        li.innerText = msg;

        document.getElementById("messages").appendChild(li);

        // scroll automático
        window.scrollTo(0, document.body.scrollHeight);
    },

    bindEvents() {
        const input = document.getElementById("msg");

        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                this.send();
            }
        });
    },

    init() {
        this.connect();
        this.bindEvents();
    }
};

// inicia aplicação
app.init();