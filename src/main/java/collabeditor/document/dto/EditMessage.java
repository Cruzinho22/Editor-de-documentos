package collabeditor.document.dto;

import collabeditor.document.model.OperationType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EditMessage {
    private Long documentId;
    private String content;
    private String senderId;

}