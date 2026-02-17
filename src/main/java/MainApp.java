package com.quantumbluff;

import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Label;
import javafx.scene.layout.StackPane;
import javafx.stage.Stage;

public class MainApp extends Application {

    @Override
    public void start(Stage stage) {
        String version = System.getProperty("java.version");
        String javafxVersion = System.getProperty("javafx.version");
        
        Label l = new Label("Quantum Bluff - Phase 1 Validation\nJava: " + version + "\nJavaFX: " + javafxVersion);
        Scene scene = new Scene(new StackPane(l), 400, 200);
        
        stage.setTitle("Quantum Bluff - Milestone M1");
        stage.setScene(scene);
        stage.show();
    }

    public static void main(String[] args) {
        launch();
    }
}