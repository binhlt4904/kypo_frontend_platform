<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password'); section>
    <#if section = "header">
        <#-- intentionally empty: #kc-page-title is hidden via CSS, brand
             is rendered inside section="form" instead -->
    <#elseif section = "form">

        <#-- Background battle: red-team attackers vs a blue-team repair
             crew, patrolled by an AV drone, all behind a firewall line.
             Auto-resizes to the window (see login.js). -->
        <canvas id="cyber-bg"></canvas>
        <div class="center-glow"></div>

        <div class="login-wrap">
            <div class="login-col">
                <div class="brand-row">
                    <div class="brand-title">Vườn Trẻ</div>
                    <div class="brand-sub">${msg("brandTag")}</div>
                    <div class="brand-rule"></div>
                </div>

                <form class="login-card" id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                    <div class="login-heading">${msg("loginTitle")}</div>
                    <div class="login-subheading">${msg("loginSubtitle")}</div>

                    <div class="field">
                        <label for="lg-user">
                            <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
                            <span class="req">*</span>
                        </label>
                        <div class="input-wrap">
                            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            <#if usernameEditDisabled??>
                                <input tabindex="1" id="lg-user" class="${properties.kcInputClass!}" name="username"
                                       value="${(login.username!'')}" type="text" disabled />
                            <#else>
                                <input tabindex="1" id="lg-user" class="${properties.kcInputClass!}" name="username"
                                       value="${(login.username!'')}" type="text" autofocus autocomplete="off"
                                       placeholder="crczp-admin"
                                       aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>" />
                            </#if>
                        </div>
                        <#if messagesPerField.existsError('username','password')>
                            <span id="input-error" class="field-error" aria-live="polite">
                                ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
                            </span>
                        </#if>
                    </div>

                    <div class="field">
                        <label for="lg-pass">${msg("password")} <span class="req">*</span></label>
                        <div class="input-wrap pw-wrap">
                            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            <input tabindex="2" id="lg-pass" class="${properties.kcInputClass!}" name="password"
                                   type="password" autocomplete="off" placeholder="••••••••••••"
                                   aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>" />
                            <button type="button" class="eye-toggle" id="eyeToggle" aria-label="Show/hide password">
                                <svg id="eyeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                        </div>
                    </div>

                    <input type="hidden" id="id-hidden-input" name="credentialId"
                           <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if> />

                    <button class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!}"
                            tabindex="4" name="login" id="kc-login" type="submit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" width="15" height="15"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                        ${msg("doLogIn")}
                    </button>

                    <div class="login-footer"><span class="dot"></span> ${msg("statusLine")}</div>
                </form>
            </div>
        </div>

    </#if>
</@layout.registrationLayout>
