package collab_editor.websocket;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class DocumentWebSocketController {
    @MessageMapping("/edit")
    @SendTo("/topic/document")
    public EditMessage handleEdit(EditMessage message) {
        return message;
    }
}
