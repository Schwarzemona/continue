import { ILLM } from "core";
import { isModelInstaller } from "core/llm";
import * as vscode from "vscode";

/**
 * @param error Handles common LLM errors. Currently handles Ollama and Lemonade-related errors.
 * @returns true if error is handled, false otherwise
 */
export async function handleLLMError(error: unknown): Promise<boolean> {
  if (!error || !(error instanceof Error) || !error.message) {
    return false;
  }

  // Handle Lemonade errors
  if (error.message.toLowerCase().includes("lemonade")) {
    let message: string = error.message;
    let options: string[] | undefined;

    // For Windows, offer to start Lemonade if it's installed but not running
    if (
      process.platform === "win32" &&
      message.includes("Lemonade server may not be running")
    ) {
      options = ["Lemonadeを開始", "セットアップ手順"];
    } else {
      // For all other cases (Linux, not installed, etc.), direct to setup instructions
      options = ["セットアップ手順"];
    }

    vscode.window.showErrorMessage(message, ...options).then((val) => {
      if (val === "セットアップ手順") {
        vscode.env.openExternal(vscode.Uri.parse("https://lemonade-server.ai"));
      } else if (val === "Lemonadeを開始") {
        vscode.commands.executeCommand("continue.startLocalLemonade");
      }
    });
    return true;
  }

  // Handle Ollama errors
  if (!error.message.toLowerCase().includes("ollama")) {
    return false;
  }
  let message: string = error.message;
  let options: string[] | undefined;
  let modelName = undefined;
  if (message.includes("Ollama may not be installed")) {
    options = ["Ollamaをダウンロード"];
  } else if (message.includes("Ollama may not be running")) {
    options = ["Ollamaを開始"]; // We want "Start" to be the only choice
  } else if (message.includes("ollama run") && "llm" in error) {
    //extract model name from error message matching the pattern "ollama run <model-name>"
    modelName = message.match(/`ollama run (.*)`/)?.[1];
    const llm = error.llm as ILLM;
    if (isModelInstaller(llm) && (await llm.isInstallingModel(modelName!))) {
      console.log(`${llm.providerName} already installing ${modelName}`);
      return false;
    }
    message = `Ollamaにモデル"${modelName}"が見つかりません。インストールが必要です。`;
    options = [`モデルをインストール`];
  }
  if (options === undefined) {
    console.log("Found an unhandled Ollama error: ", message);
    return false;
  }

  vscode.window.showErrorMessage(message, ...options).then((val) => {
    if (val === "Ollamaをダウンロード") {
      vscode.env.openExternal(vscode.Uri.parse("https://ollama.ai/download"));
    } else if (val === "Ollamaを開始") {
      vscode.commands.executeCommand("continue.startLocalOllama");
    } else if (val === "モデルをインストール" && "llm" in error) {
      //Eventually, we might be able to support installing models for other LLM providers than Ollama
      vscode.commands.executeCommand(
        "continue.installModel",
        modelName,
        error.llm,
      );
    }
  });
  return true;
}
