
/**
 * @fileoverview This file contains the deterministic Jetpack Compose code generator.
 * It takes a component tree and generates a single Kotlin file with pure composables.
 */
import type { DesignComponent, BaseComponentProps, CustomComponentTemplate } from '@/types/compose-spec';

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
        if(top > 0 || bottom > 0 || start > 0 || end > 0) {
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
    
    if (p.clickable) modifierLines.push(`clickable { /* TODO: Implement click action: ${p.onClickAction?.type} - ${p.onClickAction?.value} */ }`);

    if (modifierLines.length === 0) return "";
    if (modifierLines.length === 1) return `modifier = Modifier.${modifierLines[0]}`;

    return `modifier = Modifier\n${indent(level + 2)}.${modifierLines.join(`\n${indent(level + 2)}.`)}`;
}

function generateComposable(
    component: DesignComponent,
    allComponents: DesignComponent[],
    customComponentTemplates: CustomComponentTemplate[],
    level: number
): string {
    if (!component || !component.type) {
        console.warn('generateComposable called with invalid component:', component);
        return "";
    }

    const { type, properties, name, templateIdRef } = component;
    const p = properties || {};
    let composableName: string;
    let isContainer = false;

    let effectiveType = type;
    if (templateIdRef) {
        const template = customComponentTemplates.find(t => t.templateId === templateIdRef);
        const rootComponent = template?.componentTree.find(c => c.id === template.rootComponentId);
        if (rootComponent) {
            effectiveType = rootComponent.type;
        }
    }
    
    // Determine composable name and if it's a container
    if (templateIdRef) {
        composableName = name.replace(/[^a-zA-Z0-9]/g, '');
        isContainer = true; // Assume custom components can be containers
    } else {
        composableName = effectiveType;
        isContainer = Array.isArray(p.children) && p.children.length > 0;
    }

    const modifierString = generateModifiers(p, level);

    let propsString: string[] = [];

    // Component-specific properties
    if (effectiveType === 'Text') {
        propsString.push(`text = "${p.text || ""}"`);
        if (p.textColor) propsString.push(`color = Color(android.graphics.Color.parseColor("${p.textColor}"))`);
        if (p.fontSize) propsString.push(`fontSize = ${p.fontSize}.sp`);
    } else if (effectiveType === 'Button') {
        propsString.push(`onClick = { /* TODO: Implement click */ }`);
    } else if (effectiveType === 'Image') {
        propsString.push(`model = "${p.src || "https://placehold.co/100x100.png"}"`);
        propsString.push(`contentDescription = "${p.contentDescription || name}"`);
    } else if (effectiveType && (effectiveType.startsWith('Lazy') || effectiveType === 'Column' || effectiveType === 'Row')) {
        const arrangementType = (effectiveType === 'Column' || effectiveType === 'LazyColumn') ? 'verticalArrangement' : 'horizontalArrangement';
        if (p[arrangementType]) {
            const arrangement = p[arrangementType] as string;
            const composeArrangement = `Arrangement.${arrangement.charAt(0).toLowerCase() + arrangement.slice(1)}`;
            propsString.push(`${arrangementType} = ${composeArrangement}`);
        }
        if (p.itemSpacing && p.itemSpacing > 0) {
            const arrangementKey = (effectiveType === 'Column' || effectiveType === 'LazyColumn') ? 'verticalArrangement' : 'horizontalArrangement';
            if(!propsString.some(s => s.startsWith(arrangementKey))) {
                propsString.push(`${arrangementKey} = Arrangement.spacedBy(${p.itemSpacing}.dp)`);
            }
        }
    } else if (effectiveType === 'Spacer') {
        // Modifiers are handled, no extra props needed here
    }

    if (modifierString) {
        propsString.unshift(modifierString);
    }
    
    const finalPropsString = propsString.length > 0 ? `(\n${indent(level + 1)}${propsString.join(`,\n${indent(level + 1)}`)}\n${indent(level)})` : '()';

    let childrenString = "";
    if (isContainer) {
        childrenString = ` {\n`;
        const children = (p.children || [])
            .map((child: string | DesignComponent) => typeof child === 'string' ? allComponents.find(c => c.id === child) : child)
            .filter((c): c is DesignComponent => !!c); // Ensure children are valid components

        childrenString += children.map(child => generateComposable(child, allComponents, customComponentTemplates, level + 1)).join('\n');
        
        childrenString += `\n${indent(level)}}`;
    } else if (effectiveType === 'Button') {
        // Special case for button with text
        childrenString = ` { Text("${p.text || 'Button'}") }`;
    }

    const composableCall = templateIdRef ? composableName : (effectiveType === 'Image' ? 'AsyncImage' : effectiveType);

    return `${indent(level)}${composableCall}${finalPropsString}${childrenString}`;
}


function generateAllComposables(
    componentTree: DesignComponent,
    allComponents: DesignComponent[],
    customComponentTemplates: CustomComponentTemplate[],
): string {
    let allComposables = new Map<string, string>();
    const processingQueue: DesignComponent[] = [componentTree];
    const processedIds = new Set<string>();

    while(processingQueue.length > 0) {
        const component = processingQueue.shift()!;
        if (processedIds.has(component.id) || !component) continue;
        processedIds.add(component.id);

        // If it's a custom component instance, generate its definition
        if (component.templateIdRef && !allComposables.has(component.templateIdRef)) {
            const template = customComponentTemplates.find(t => t.templateId === component.templateIdRef);
            if (template) {
                const rootComponentInTemplate = template.componentTree.find(c => c.id === template.rootComponentId);
                 if(rootComponentInTemplate) {
                    const composableName = component.name.replace(/[^a-zA-Z0-9]/g, '');

                    // Build the tree for the template's internal structure
                     const buildTemplateTree = (compId: string): DesignComponent | null => {
                        const comp = template.componentTree.find(c => c.id === compId);
                        if (!comp) return null;
                        const children = (comp.properties.children || [])
                            .map((childId: string) => buildTemplateTree(childId))
                            .filter((c): c is DesignComponent => c !== null);
                        return { ...comp, properties: { ...comp.properties, children } };
                    };
                    
                    const templateTree = buildTemplateTree(rootComponentInTemplate.id);

                    if (templateTree) {
                        const composableBody = generateComposable(templateTree, template.componentTree, customComponentTemplates, 1);
                        const composableCode = `@Composable\nfun ${composableName}() {\n${composableBody}\n}\n`;
                        allComposables.set(component.templateIdRef, composableCode);
                    }
                }
            }
        }

        // Add its children to the queue
        if (Array.isArray(component.properties.children)) {
            const children = (component.properties.children)
                .map(child => typeof child === 'string' ? allComponents.find(c => c.id === child) : child)
                .filter((c): c is DesignComponent => c !== undefined);

            processingQueue.push(...children);
        }
    }
    
    // Main screen composable
    const mainScreenCode = `@Composable
fun GeneratedScreen() {
    // It's recommended to place Theme.kt in your project's ui.theme package.
    AppTheme {
${generateComposable(componentTree, allComponents, customComponentTemplates, 2)}
    }
}`;
    allComposables.set('main', mainScreenCode);

    return Array.from(allComposables.values()).join('\n\n');
}

export function generateComposableCode(
    componentTree: DesignComponent,
    allComponents: DesignComponent[],
    customComponentTemplates: CustomComponentTemplate[],
): string {
    if (!componentTree) return "// No root component found to generate code.";

    const header = `import androidx.compose.foundation.layout.*
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

// Assuming AppTheme is defined in a file like ui/theme/Theme.kt
// import com.example.app.ui.theme.AppTheme
// import com.example.app.ui.theme.customColors

// This is a generated file. Modifications may be overwritten.

`;

    const allComposablesString = generateAllComposables(componentTree, allComponents, customComponentTemplates);

    return header + allComposablesString;
}

    