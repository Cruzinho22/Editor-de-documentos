package collab_editor.document.controller;

import collab_editor.websocket.EditMessage;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class DocumentController {
    @MessageMapping
    @SendTo("/topic/document")
    public EditMessage handleEdit(EditMessage message){
        return message;
    }
}
