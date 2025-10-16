

// THIS IS A NEW FILE

/**
 * @fileoverview This file contains the deterministic Jetpack Compose code generator.
 * It takes a component tree and generates Kotlin code without using AI.
 */

// Helper function to extract all unique properties from the component tree
const getAllProperties = (node: any, propertiesSet: Set<string>) => {
    if (node.properties) {
        Object.keys(node.properties).forEach(prop => propertiesSet.add(prop));
    }
    if (node.children) {
        node.children.forEach((child: any) => getAllProperties(child, propertiesSet));
    }
    if(node.topBar) getAllProperties(node.topBar, propertiesSet);
    if(node.content) getAllProperties(node.content, propertiesSet);
    if(node.bottomBar) getAllProperties(node.bottomBar, propertiesSet);
};


export function generateComponentDtoKt(componentTree: any): string {
    const propertiesSet = new Set<string>();
    getAllProperties(componentTree, propertiesSet);

    // Filter out 'children' as it's handled separately.
    propertiesSet.delete('children');

    const propsStrings = Array.from(propertiesSet).sort().map(prop => {
        // Convert camelCase to snake_case for the JSON key, which is a common convention
        const jsonKey = prop.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        return `    @SerialName("${jsonKey}") val ${prop}: String? = null`;
    });
    
    const childrenProp = `    @SerialName("children") val children: List<ComponentDto>? = null`;

    return `package com.example.myapplication.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ComponentDto(
    @SerialName("id") val id: String? = null,
    @SerialName("type") val type: String? = null,
    @SerialName("properties") val properties: PropertiesDto? = null
)

@Serializable
data class PropertiesDto(
${propsStrings.join(',\n')},
${childrenProp}
)
`;
}


const generateModifiers = (props: any): string => {
    let modifierString = "";

    if (props.fillMaxSize) modifierString += ".fillMaxSize()";
    else {
        if (props.fillMaxWidth) modifierString += ".fillMaxWidth()";
        if (props.fillMaxHeight) modifierString += ".fillMaxHeight()";
    }

    if (props.width && !props.fillMaxWidth) modifierString += `.width(${props.width}.dp)`;
    if (props.height && !props.fillMaxHeight) modifierString += `.height(${props.height}.dp)`;
    if (props.layoutWeight) modifierString += `.weight(${props.layoutWeight}f)`;

    const hasPadding = props.padding || props.paddingTop || props.paddingBottom || props.paddingStart || props.paddingEnd;
    if (hasPadding) {
        if (props.padding) {
            modifierString += `.padding(${props.padding}.dp)`;
        } else {
            modifierString += `.padding(start = ${props.paddingStart || 0}.dp, top = ${props.paddingTop || 0}.dp, end = ${props.paddingEnd || 0}.dp, bottom = ${props.paddingBottom || 0}.dp)`;
        }
    }
    
    if(props.borderWidth > 0 && props.borderColor) {
        modifierString += `.border(${props.borderWidth}.dp, color = Color(android.graphics.Color.parseColor("${props.borderColor}")), shape = RoundedCornerShape(${props.cornerRadius ?? 4}.dp))`;
    }
    
    if (props.backgroundColor) {
        modifierString += `.background(Color(android.graphics.Color.parseColor("${props.backgroundColor}")), shape = RoundedCornerShape(${props.cornerRadius ?? 4}.dp))`;
    }
    
    if(props.clickable) {
        modifierString += ".clickable { /* Handle click action */ }";
    }

    // Add more modifiers here based on other properties...
    return modifierString.length > 0 ? `modifier = Modifier${modifierString}` : "";
};


const generateComponentComposable = (component: any): string => {
    if (!component || !component.type) return "";

    const { type, properties = {}, children = [] } = component;
    const modifiers = generateModifiers(properties);
    const args = [modifiers].filter(Boolean).join(",\\n        ");

    switch (type) {
        case 'Text':
            return `
    Text(
        text = componentDto.properties?.text ?: "",
        fontSize = componentDto.properties?.fontSize?.toFloatOrNull()?.sp ?: 16.sp,
        color = componentDto.properties?.textColor?.let { Color(android.graphics.Color.parseColor(it)) } ?: Color.Unspecified,
        ${args}
    )`;
        case 'Button':
             return `
    Button(
        onClick = { /* Handle Click */ },
        ${args}
    ) {
        Text(text = componentDto.properties?.text ?: "Button")
    }`;
        case 'Image':
             return `
    AsyncImage(
        model = componentDto.properties?.src,
        contentDescription = componentDto.properties?.contentDescription,
        ${args}
    )`;
        case 'Column':
        case 'Row':
        case 'Box':
        case 'Card':
        case 'LazyColumn':
        case 'LazyRow':
             const arrangement = type === 'Column' || type === 'LazyColumn' ?
                `verticalArrangement = Arrangement.spacedBy(${properties.itemSpacing || 0}.dp)` :
                `horizontalArrangement = Arrangement.spacedBy(${properties.itemSpacing || 0}.dp)`;

            return `
    ${type}(
        ${args.length > 0 ? args + ',' : ''}
        ${arrangement}
    ) {
        componentDto.properties?.children?.forEach { childDto ->
            DynamicUiComponent(componentDto = childDto)
        }
    }`;
        case 'Spacer':
            return `
    Spacer(${args})`
        
        case 'Scaffold':
            const topBar = component.topBar ? `topBar = { DynamicUiComponent(componentDto = componentDto.properties?.children?.find { it.type == "TopAppBar" }!!) }` : "";
            const bottomBar = component.bottomBar ? `bottomBar = { DynamicUiComponent(componentDto = componentDto.properties?.children?.find { it.type == "BottomNavigationBar" }!!) }` : "";
            const content = component.content ? `
        DynamicUiComponent(componentDto = componentDto.properties?.children?.find { it.type == "LazyColumn" }!!)
            ` : "";

             return `
    Scaffold(
        ${topBar}${topBar && bottomBar ? ',' : ''}
        ${bottomBar}
    ) { paddingValues ->
        Box(modifier = Modifier.padding(paddingValues)) {
            ${content}
        }
    }`;
        case 'TopAppBar':
             return `
    TopAppBar(
        title = { Text(componentDto.properties?.title ?: "Title") },
        ${args}
    )
             `
        default:
            return `
    // Unknown component type: ${type}
    Box(modifier = Modifier.padding(8.dp).border(1.dp, Color.Red)) {
        Text("Unknown: ${type}")
    }`;
    }
};

export function generateDynamicUiComponentKt(componentTree: any): string {
    // This is a simplified generator. A real one would need to be more robust.
    const allComponentTypes = new Set<string>();
    const collectTypes = (node: any) => {
        if (node.type) allComponentTypes.add(node.type);
        if (node.children) node.children.forEach(collectTypes);
        if(node.topBar) collectTypes(node.topBar);
        if(node.content) collectTypes(node.content);
        if(node.bottomBar) collectTypes(node.bottomBar);
    };
    collectTypes(componentTree);

    const whenCases = Array.from(allComponentTypes).map(type => {
        // Create a dummy component of this type to generate the code snippet
        const dummyComponent = { type, properties: componentTree.properties }; 
        if(componentTree.children) dummyComponent.properties.children = componentTree.children;
        return `        "${type}" -> {
${generateComponentComposable(dummyComponent)}
        }`;
    }).join("\n");

    return `package com.example.myapplication.presentation.components

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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.myapplication.data.model.ComponentDto

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DynamicUiComponent(componentDto: ComponentDto) {
    when (componentDto.type) {
${whenCases}
        else -> {
            // Render a placeholder for unknown types
            Box(modifier = Modifier.padding(8.dp).border(1.dp, Color.Gray)) {
                Text(text = "Unsupported component: \${componentDto.type}")
            }
        }
    }
}
`;
}
