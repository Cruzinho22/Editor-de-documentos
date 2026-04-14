package collabeditor.document.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
public class DocumentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // O banco gera o ID para você
    private Long id;

    @Column(columnDefinition = "TEXT") // Dica: para conteúdos longos, use TEXT
    private String content;

    private String name;

    // Removi o SenderId daqui, pois o ID do remetente costuma
    // ser parte da mensagem (transiente), não do documento fixo no banco.
}
