package collabeditor.document.model;

public enum OperationType {
    INSERT {
        @Override
        public boolean requiresContent() { return true; }
    },
    DELETE {
        @Override
        public boolean requiresContent() { return false; }
    },
    REPLACE {
        @Override
        public boolean requiresContent() { return true; }
    };

    public abstract boolean requiresContent();
}