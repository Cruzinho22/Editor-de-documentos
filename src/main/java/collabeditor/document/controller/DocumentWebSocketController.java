package collabeditor.document.controller;

import collabeditor.document.dto.EditMessage;
import collabeditor.document.model.DocumentEntity;
import collabeditor.document.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@RequiredArgsConstructor
@Controller
public class DocumentWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final DocumentService documentService;

    @MessageMapping("/edit")
    public void handleEdit(EditMessage message) {

        DocumentEntity updated = documentService.applyEdit(message);

        EditMessage response = new EditMessage(
                updated.getId(),
                updated.getContent(),
                message.getSenderId() 
        );

        messagingTemplate.convertAndSend(
                "/topic/document/" + updated.getId(),
                response
        );
    }
}