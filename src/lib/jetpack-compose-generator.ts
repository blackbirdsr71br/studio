
/**
 * @fileoverview This file contains the deterministic Jetpack Compose code generator.
 * It takes a component tree and generates a single Kotlin file with pure composables.
 */
import type { DesignComponent, BaseComponentProps, CustomComponentTemplate, ClickAction } from '@/types/compose-spec';

function indent(level: number): string {
    return '    '.repeat(level);
}

function generateModifiers(props: BaseComponentProps, level: number): string {
    let modifierLines: string[] = [];
    const p = props || {};

    if (p.fillMaxSize) modifierLines.push('fillMaxSize()');
    else {
        if (p.fillMaxWidth) modifierLines.push('fillMaxWidth()');
        if (p.fillMaxHeight) modifierLines.push('fillMaxHeight()');
    }

    if (typeof p.width === 'number' && !p.fillMaxWidth && !p.fillMaxSize) modifierLines.push(`width(${p.width}.dp)`);
    if (typeof p.height === 'number' && !p.fillMaxHeight && !p.fillMaxSize) modifierLines.push(`height(${p.height}.dp)`);
    if (typeof p.layoutWeight === 'number' && p.layoutWeight > 0) modifierLines.push(`weight(${p.layoutWeight}f)`);

    const hasSpecificPadding = typeof p.paddingTop === 'number' || typeof p.paddingBottom === 'number' || typeof p.paddingStart === 'number' || typeof p.paddingEnd === 'number';
    if (typeof p.padding === 'number' && p.padding > 0 && !hasSpecificPadding) {
        modifierLines.push(`padding(${p.padding}.dp)`);
    } else if (hasSpecificPadding) {
        const top = p.paddingTop ?? 0;
        const bottom = p.paddingBottom ?? 0;
        const start = p.paddingStart ?? 0;
        const end = p.paddingEnd ?? 0;
        if (top > 0 || bottom > 0 || start > 0 || end > 0) {
            modifierLines.push(`padding(start = ${start}.dp, top = ${top}.dp, end = ${end}.dp, bottom = ${bottom}.dp)`);
        }
    }

    if (p.borderWidth && p.borderWidth > 0 && p.borderColor) {
        modifierLines.push(`border(${p.borderWidth}.dp, color = Color(android.graphics.Color.parseColor("${p.borderColor}")))`);
    }

    if (p.backgroundColor) {
        if (typeof p.backgroundColor === 'object' && p.backgroundColor.type === 'linearGradient') {
            const colors = p.backgroundColor.colors.map((c: string) => `Color(android.graphics.Color.parseColor("${c}"))`).join(', ');
            modifierLines.push(`background(brush = Brush.linearGradient(colors = listOf(${colors})))`);
        } else if (typeof p.backgroundColor === 'string' && p.backgroundColor !== 'transparent') {
            modifierLines.push(`background(color = Color(android.graphics.Color.parseColor("${p.backgroundColor}")))`);
        }
    }
    
    if (p.clickable) {
        const action = p.onClickAction || { type: 'SHOW_TOAST', value: 'Clicked' };
        modifierLines.push(`clickable { onComponentClick("${action.type}", "${action.value}") }`);
    }

    if (modifierLines.length === 0) return "";
    if (modifierLines.length === 1) return `modifier = Modifier.${modifierLines[0]}`;

    return `modifier = Modifier\n${indent(level + 2)}.${modifierLines.join(`\n${indent(level + 2)}.`)}`;
}

function generateComposable(
    component: DesignComponent,
    isMvi: boolean,
    level: number
): string {
    if (!component || !component.type) {
        console.warn('generateComposable called with invalid component:', component);
        return "";
    }

    const { type, properties, name, children } = component;
    const p = properties || {};
    
    const composableName = type;
    const isContainer = Array.isArray(children) && children.length > 0;

    const modifierString = generateModifiers(p, level);

    let propsString: string[] = [];

    if (type === 'Text') {
        propsString.push(`text = "${p.text || ""}"`);
        if (p.textColor) propsString.push(`color = Color(android.graphics.Color.parseColor("${p.textColor}"))`);
        if (p.fontSize) propsString.push(`fontSize = ${p.fontSize}.sp`);
    } else if (type === 'Button') {
        const action = p.onClickAction || { type: 'SHOW_TOAST', value: 'Button Tapped!' };
        propsString.push(`onClick = { onComponentClick("${action.type}", "${action.value}") }`);
    } else if (type === 'Image') {
        propsString.push(`model = "${p.src || "https://placehold.co/100x100.png"}"`);
        propsString.push(`contentDescription = "${p.contentDescription || name}"`);
    } else if (type.startsWith('Lazy') || type === 'Column' || type === 'Row') {
        const arrangementType = (type === 'Column' || type === 'LazyColumn') ? 'verticalArrangement' : 'horizontalArrangement';
        if (p[arrangementType]) {
            const arrangement = p[arrangementType] as string;
            const composeArrangement = `Arrangement.${arrangement.charAt(0).toLowerCase() + arrangement.slice(1)}`;
            propsString.push(`${arrangementType} = ${composeArrangement}`);
        }
        if (p.itemSpacing && p.itemSpacing > 0) {
             const arrangementKey = (type === 'Column' || type === 'LazyColumn') ? 'verticalArrangement' : 'horizontalArrangement';
            if(!propsString.some(s => s.startsWith(arrangementKey))) {
                propsString.push(`${arrangementKey} = Arrangement.spacedBy(${p.itemSpacing}.dp)`);
            }
        }
    }

    if (modifierString) {
        propsString.unshift(modifierString);
    }
    
    const finalPropsString = propsString.length > 0 ? `(\n${indent(level + 1)}${propsString.join(`,\n${indent(level + 1)}`)}\n${indent(level)})` : '()';

    let childrenString = "";
    if (isContainer) {
        childrenString = ` {\n`;
        if (type.startsWith("Lazy")) {
             childrenString += `${indent(level + 1)}items(items) { item ->\n`;
             childrenString += `${indent(level + 2)}// Replace with your item rendering logic\n`;
             childrenString += `${indent(level + 1)}}\n`;
        } else {
            childrenString += (children as DesignComponent[]).map(child => generateComposable(child, isMvi, level + 1)).join('\n');
        }
        childrenString += `\n${indent(level)}}`;
    } else if (type === 'Button' && p.text) {
        childrenString = ` { Text("${p.text}") }`;
    }

    const composableCall = type === 'Image' ? 'AsyncImage' : composableName;

    return `${indent(level)}${composableCall}${finalPropsString}${childrenString}`;
}

export function generateComposableCode(
    componentTree: DesignComponent,
    allComponents: DesignComponent[], // kept for future use if needed
    customComponentTemplates: CustomComponentTemplate[], // kept for future use if needed
    isMvi: boolean
): string {
    if (!componentTree) return "// No root component found to generate code.";

    const mainComposableBody = generateComposable(componentTree, isMvi, 1);

    if (isMvi) {
        // This is the implementation for the full MVI project structure
        return `
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import org.json.JSONArray
import org.json.JSONObject

@Composable
fun DynamicScreen(
    layoutJson: String,
    onComponentClick: (action: String, value: String) -> Unit
) {
    // This is a placeholder for a real JSON parser.
    // In a production app, you'd parse the layoutJson and dynamically build the UI.
    // For this generated code, we embed the structure directly.
    GeneratedContent(onComponentClick)
}

@Composable
private fun GeneratedContent(onComponentClick: (action: String, value: String) -> Unit) {
    // This is where the user's designed layout starts.
${mainComposableBody}
}
`;
    }

    // Original single-file generation logic
    return `
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage

// Assuming AppTheme is defined elsewhere.
// This is a placeholder.
@Composable
fun AppTheme(content: @Composable () -> Unit) {
    MaterialTheme {
        content()
    }
}

@Composable
fun GeneratedScreen() {
    AppTheme {
        ${mainComposableBody}
    }
}
`;
}
